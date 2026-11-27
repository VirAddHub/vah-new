/**
 * Admin "Company checks": company due diligence with the Companies House public data API.
 * Mounted at /api/admin/company-checks. Every route requires an administrator; every change is
 * audited (admin_audit for administrators, audit_log for automation).
 *
 * The system retrieves and compares everything it can; administrators only make judgements,
 * resolve discrepancies and decide. Automated results never approve a customer.
 * Individual identity, address, PEP, sanctions and adverse-media checks are not done here.
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { requireAdmin } from '../../middleware/auth';
import { getPool } from '../db';
import { logger } from '../../lib/logger';
import { param } from '../../lib/express-params';
import { ChError, chClient, normaliseCompanyNumber, searchCompanies, type ChClient } from '../services/companyChecks/chClient';
import { analyse, JUDGEMENT, JUDGEMENT_IDS, nextAction, satisfactoryBlockers } from '../services/companyChecks/analysis';
import { audit, detail, ensureCheck, getCheck, loadCustomer, loadCustomersBulk, refreshSnapshot, saveReport, syncDiscrepancies } from '../services/companyChecks/store';
import { ensureAllChecks } from '../services/companyChecks/automation';
import { latestDeclaration } from '../services/companyChecks/declaration';
import { identityProviderStatus } from '../services/identityVerification';
import { DEADLINE_DAYS, tableReady as preTableReady } from '../services/companyChecks/preIncorporation';
import { isBeneficialOwner } from '../services/companyChecks/declaration';

/** For tests: replace the Companies House client. */
export { setChClientFactory } from '../services/companyChecks/chClient';
const clientFactory = () => chClient();

const router = Router();
router.use('/company-checks', requireAdmin);

// Calls that reach Companies House share the key's 600-per-5-minutes allowance with public search.
const chLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req: Request) => `admin:${(req as any).user?.id ?? 'unknown'}`,
    message: { ok: false, error: 'rate_limited', message: 'Too many Companies House requests. Wait a few minutes.' },
});

// Creating checks for customers who have a company number is done by the hourly job. The queue
// also nudges it, in the background and at most every 10 minutes, so opening the page stays fast.
let lastEnsure = 0;
function ensureChecksSoon(db: any) {
    if (Date.now() - lastEnsure < 10 * 60 * 1000) return;
    lastEnsure = Date.now();
    ensureAllChecks(db).catch(e => logger.warn('[company-checks] ensureAllChecks failed', { message: (e as Error)?.message }));
}

const admin = (req: Request) => ({ id: Number((req as any).user!.id), email: ((req as any).user?.email as string) ?? null });
const idParam = (req: Request, name = 'id') => { const n = Number(param(req, name)); return Number.isSafeInteger(n) && n > 0 ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function chFailure(res: Response, e: unknown) {
    if (e instanceof ChError) {
        const status = e.code === 'not_configured' ? 503 : e.code === 'not_found' ? 404 : e.code === 'rate_limited' ? 429 : e.code === 'bad_request' ? 400 : 502;
        return res.status(status).json({ ok: false, error: `companies_house_${e.code}`, message: e.message });
    }
    logger.error('[company-checks] unexpected error', { message: (e as Error)?.message });
    return res.status(500).json({ ok: false, error: 'server_error', message: 'Something went wrong. Nothing was changed.' });
}

/** GET /summary — counts for the admin navigation badge (items needing an administrator). */
router.get('/company-checks/summary', async (_req, res) => {
    try {
        const r = (await getPool().query(`
            SELECT (SELECT COUNT(*)::int FROM company_check_alert WHERE acknowledged_at IS NULL) AS open_alerts,
                   (SELECT COUNT(*)::int FROM company_check WHERE status = 'further_investigation') AS investigating,
                   (SELECT COUNT(*)::int FROM company_check WHERE status <> 'satisfactory') AS open_checks`)).rows[0];
        return res.json({ ok: true, data: { ...r, needs_attention: r.open_alerts + r.investigating } });
    } catch (e) { return chFailure(res, e); }
});

/**
 * GET / — the work queue, most urgent first, each with its next action.
 * ?view=action|waiting|satisfactory|all&q=&user_id=
 * Customers with a company number get a check from the hourly job (nudged from here in the background).
 */
router.get('/company-checks', async (req, res) => {
    const view = text(req.query.view, 20) || 'action';
    const q = text(req.query.q, 100).toLowerCase();
    const userId = Number(req.query.user_id) || null;
    const db = getPool();
    try {
        ensureChecksSoon(db);
        const rows = (await db.query(`
            SELECT c.id, c.user_id, c.business_id, c.company_number, c.company_name, c.status, c.risk_rating, c.monitoring, c.fetched_at, c.fetch_error,
                   c.updated_at, c.checklist, c.snapshot, u.email, u.first_name, u.last_name,
                   (SELECT COUNT(*)::int FROM company_check_alert a WHERE a.check_id = c.id AND a.acknowledged_at IS NULL) AS open_alerts,
                   (SELECT COUNT(*)::int FROM company_check_entry e WHERE e.check_id = c.id AND e.kind = 'discrepancy' AND e.resolved_at IS NULL) AS open_discrepancies,
                   (SELECT COUNT(*)::int FROM company_check_evidence v WHERE v.check_id = c.id AND v.kind = 'beneficial_ownership') AS bo_evidence,
                   (SELECT COUNT(*)::int FROM company_check o JOIN "user" ou ON ou.id = o.user_id WHERE o.company_number = c.company_number AND o.id <> c.id AND ou.deleted_at IS NULL) AS shared_count,
                   (SELECT MAX(d.submitted_at) FROM company_declaration d WHERE d.user_id = c.user_id AND d.company_number = c.company_number) AS declaration_at
              FROM company_check c JOIN "user" u ON u.id = c.user_id
             WHERE u.deleted_at IS NULL ${userId ? 'AND c.user_id = $1' : ''}
             ORDER BY c.updated_at DESC LIMIT 500`, userId ? [userId] : [])).rows;
        const customers = await loadCustomersBulk(db, rows);
        const items: any[] = [];
        for (const c of rows) {
            const customer = customers.get(Number(c.id));
            if (!customer) continue;
            const a = analyse(c.snapshot ?? null, customer);
            const blockers = satisfactoryBlockers({ checklist: c.checklist || {}, automated: a.automated, attention: a.attention,
                unrecordedDiscrepancies: 0, unresolvedDiscrepancies: c.open_discrepancies, beneficialOwnerEvidence: c.bo_evidence, riskRating: c.risk_rating });
            const next = nextAction({ status: c.status, hasSnapshot: !!c.snapshot, fetchError: c.fetch_error, openAlerts: c.open_alerts,
                unresolved: c.open_discrepancies, automated: a.automated, blockers });
            items.push({
                id: Number(c.id), user_id: Number(c.user_id), email: c.email, customer_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
                company_number: c.company_number, company_name: c.company_name || c.snapshot?.profile?.company_name || null,
                status: c.status, risk_rating: c.risk_rating, monitoring: c.monitoring, fetched_at: c.fetched_at, updated_at: c.updated_at,
                open_alerts: c.open_alerts, open_discrepancies: c.open_discrepancies, shared_count: c.shared_count, declaration_at: c.declaration_at,
                counts: { attention: a.attention, missing: a.automated.filter(x => x.status === 'missing').length, pass: a.automated.filter(x => x.status === 'pass').length, total: a.automated.length },
                next,
            });
        }
        if (!userId && await preTableReady(db)) {
            const pre = (await db.query(`
                SELECT p.*, u.email, u.first_name, u.last_name FROM pre_incorporation p JOIN "user" u ON u.id = p.user_id
                 WHERE u.deleted_at IS NULL ORDER BY p.updated_at DESC LIMIT 200`)).rows;
            for (const p of pre) {
                const overdue = p.status === 'lapsed' || (p.status === 'approved' && p.deadline_at && new Date(p.deadline_at).getTime() < Date.now());
                const next = p.status === 'submitted' ? { key: 'review_proposed', priority: 4, text: 'Review the proposed company' }
                    : p.status === 'returned' ? { key: 'await_customer', priority: 7, text: 'Waiting for the customer to correct the proposed company' }
                    : overdue && !p.lapse_reviewed_at ? { key: 'lapsed', priority: 2, text: 'Not incorporated in time: confirm the address was not used' }
                    : p.status === 'approved' ? { key: 'await_incorporation', priority: 8, text: `Waiting for incorporation (due ${new Date(p.deadline_at).toISOString().slice(0, 10)})` }
                    : { key: 'none', priority: 9, text: p.status === 'incorporated' ? `Incorporated: company ${p.company_number} has its own check` : p.status === 'refused' ? 'Refused' : 'Lapsed: reviewed' };
                items.push({ id: `pre-${p.id}`, kind: 'pre_incorporation', user_id: Number(p.user_id), email: p.email, customer_name: [p.first_name, p.last_name].filter(Boolean).join(' '),
                    company_number: null, company_name: p.proposed_name, status: p.status, updated_at: p.updated_at, open_alerts: 0, shared_count: 0,
                    declaration_at: p.status === 'submitted' ? p.submitted_at : null, next });
            }
        }
        const group = (i: any) => ['await_customer', 'await_incorporation'].includes(i.next.key) ? 'waiting' : i.next.key === 'none' ? 'satisfactory' : 'action';
        const counts = { action: 0, waiting: 0, satisfactory: 0, all: items.length };
        for (const i of items) counts[group(i) as 'action' | 'waiting' | 'satisfactory']++;
        const filtered = items
            .filter(i => view === 'all' || group(i) === view)
            .filter(i => !q || [i.company_name, i.company_number, i.email, i.customer_name].some(v => String(v ?? '').toLowerCase().includes(q)))
            .sort((x, y) => x.next.priority - y.next.priority || String(x.updated_at).localeCompare(String(y.updated_at)));
        return res.json({ ok: true, data: { items: filtered.slice(0, 200), counts } });
    } catch (e) { return chFailure(res, e); }
});

/** GET /search?q= — Companies House search by name or number. */
router.get('/company-checks/search', chLimiter, async (req, res) => {
    try {
        return res.json({ ok: true, data: await searchCompanies(clientFactory(), text(req.query.q, 160)) });
    } catch (e) { return chFailure(res, e); }
});

/** GET /customer/:userId — what the customer told us, and their existing checks (for linking). */
router.get('/company-checks/customer/:userId', async (req, res) => {
    const userId = idParam(req, 'userId');
    if (!userId) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    try {
        const c = await loadCustomer(getPool(), userId);
        if (!c) return res.status(404).json({ ok: false, error: 'user_not_found' });
        const checks = (await getPool().query(`SELECT id, company_number, company_name, status FROM company_check WHERE user_id = $1 ORDER BY id`, [userId])).rows;
        return res.json({ ok: true, data: { customer: c, checks } });
    } catch (e) { return chFailure(res, e); }
});

/** POST / { userId, companyNumber, businessId? } — link a company to a customer by hand and retrieve it. */
router.post('/company-checks', chLimiter, async (req, res) => {
    const a = admin(req);
    const userId = Number(req.body?.userId);
    const number = normaliseCompanyNumber(req.body?.companyNumber);
    const businessId = req.body?.businessId ? Number(req.body.businessId) : null;
    if (!Number.isSafeInteger(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    if (!number) return res.status(400).json({ ok: false, error: 'invalid_company_number', message: 'Enter a valid company number.' });
    const db = getPool();
    try {
        if (!(await loadCustomer(db, userId))) return res.status(404).json({ ok: false, error: 'user_not_found' });
        if (businessId && !(await db.query(`SELECT 1 FROM business WHERE id = $1 AND user_id = $2`, [businessId, userId])).rows.length) {
            return res.status(400).json({ ok: false, error: 'business_not_owned', message: 'That business does not belong to this customer.' });
        }
        const { check, created } = await ensureCheck(db, userId, number, a.id, businessId);
        if (!created) return res.status(409).json({ ok: false, error: 'already_linked', message: 'This company is already linked to the customer.', data: { id: Number(check.id) } });
        try { await refreshSnapshot(db, clientFactory(), check); } catch (e) {
            await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]);
            return res.status(201).json({ ok: true, data: { id: Number(check.id) }, warning: e instanceof ChError && e.code === 'not_found' ? 'Company not found at Companies House. Check the number.' : (e as Error).message });
        }
        return res.status(201).json({ ok: true, data: { id: Number(check.id) } });
    } catch (e) { return chFailure(res, e); }
});

/** GET /pre/:id — a pre-incorporation application (a company being formed). */
router.get('/company-checks/pre/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const db = getPool();
    try {
        const p = (await db.query(`SELECT * FROM pre_incorporation WHERE id = $1`, [id])).rows[0];
        if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
        const customer = await loadCustomer(db, Number(p.user_id));
        const history = (await db.query(`SELECT id, user_id, proposed_name, status, submitted_at, decided_at, decision_reason, company_number FROM pre_incorporation WHERE user_id = $1 AND id <> $2 ORDER BY id DESC`, [p.user_id, id])).rows;
        const people = (p.declaration?.people ?? []);
        const identity = {
            account_holder: customer?.kyc_status ?? null,
            others: people.filter((x: any) => !x.is_account_holder && (x.is_director || isBeneficialOwner(x))).map((x: any) => {
                const o = customer?.owners.find(ow => (x.email && ow.email === x.email) || String(ow.full_name).toLowerCase() === String(x.full_name).toLowerCase());
                return { name: x.full_name, status: o?.status ?? 'not invited' };
            }),
        };
        const flags: string[] = [];
        for (const x of people) if (x.country_of_residence && !/united kingdom|england|scotland|wales|northern ireland|^uk$/i.test(x.country_of_residence)) flags.push(`${x.full_name} lives outside the UK (${x.country_of_residence}).`);
        for (const c of p.declaration?.corporate_owners ?? []) flags.push(`Owned in part by a company (${c.name}): the individuals behind it are "${c.ultimate_owners}".`);
        if (p.declaration?.no_beneficial_owner_explanation) flags.push(`No one owns or controls more than 25%: ${p.declaration.no_beneficial_owner_explanation}`);
        return res.json({ ok: true, data: { pre: p, customer, history, identity, flags, deadline_days: DEADLINE_DAYS } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /pre/:id/decision { decision: approve|return|refuse, reason } */
router.post('/company-checks/pre/:id/decision', async (req, res) => {
    const id = idParam(req);
    const decision = text(req.body?.decision, 20);
    const reason = text(req.body?.reason, 2000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!['approve', 'return', 'refuse'].includes(decision)) return res.status(400).json({ ok: false, error: 'invalid_decision' });
    if (decision !== 'approve' && reason.length < 10) return res.status(400).json({ ok: false, error: 'reason_required', message: decision === 'return' ? 'Tell the customer what to correct (at least 10 characters).' : 'Give the reason for refusing (at least 10 characters).' });
    const db = getPool();
    try {
        const p = (await db.query(`SELECT * FROM pre_incorporation WHERE id = $1`, [id])).rows[0];
        if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
        if (p.status !== 'submitted') return res.status(409).json({ ok: false, error: 'not_awaiting_decision', message: 'This application is not waiting for a decision.' });
        const a = admin(req);
        const status = decision === 'approve' ? 'approved' : decision === 'return' ? 'returned' : 'refused';
        await db.query(
            `UPDATE pre_incorporation SET status = $2, decided_by = $3, decided_at = NOW(), decision_reason = $4,
                    deadline_at = CASE WHEN $2 = 'approved' THEN NOW() + ($5 || ' days')::interval ELSE deadline_at END, updated_at = NOW() WHERE id = $1`,
            [id, status, a.id, reason || null, String(DEADLINE_DAYS)]);
        await db.query(`INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, $2, 'pre_incorporation', $3, $4, NOW())`,
            [a.id, `pre_incorporation_${status}`, id, JSON.stringify({ user_id: Number(p.user_id), proposed_name: p.proposed_name, reason: reason || null })]);
        return res.json({ ok: true, data: { status } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /pre/:id/lapse-review { note } — after the deadline passed: record that the address was not used. */
router.post('/company-checks/pre/:id/lapse-review', async (req, res) => {
    const id = idParam(req);
    const note = text(req.body?.note, 2000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (note.length < 10) return res.status(400).json({ ok: false, error: 'note_required', message: 'Record what you checked (for example a Companies House search) and the outcome.' });
    const db = getPool();
    try {
        const r = await db.query(`UPDATE pre_incorporation SET status = 'lapsed', lapse_reviewed_at = NOW(), lapse_review_note = $2, updated_at = NOW()
                                   WHERE id = $1 AND lapse_reviewed_at IS NULL AND (status = 'lapsed' OR (status = 'approved' AND deadline_at < NOW())) RETURNING user_id`, [id, note]);
        if (!r.rows.length) return res.status(409).json({ ok: false, error: 'not_lapsed', message: 'This application has not lapsed, or was already reviewed.' });
        await db.query(`INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, 'pre_incorporation_lapse_reviewed', 'pre_incorporation', $2, $3, NOW())`,
            [admin(req).id, id, JSON.stringify({ user_id: Number(r.rows[0].user_id), note })]);
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

/** GET /:id — everything for one check, with the next action and what blocks completion. */
router.get('/company-checks/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    try {
        const d = await detail(getPool(), id);
        if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
        // Other accounts that gave the same company number: a risk indicator in its own right.
        const shared = (await getPool().query(
            `SELECT o.id AS check_id, o.user_id, u.email, o.status FROM company_check o JOIN "user" u ON u.id = o.user_id
              WHERE o.company_number = $1 AND o.id <> $2 AND u.deleted_at IS NULL ORDER BY o.id LIMIT 25`, [d.check.company_number, id])).rows;
        return res.json({ ok: true, data: { ...d, shared_with: shared, judgement_items: JUDGEMENT, satisfactory_blockers: d.blockers, identity_provider: identityProviderStatus() } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/refresh — retrieve the register extract again and re-compare. */
router.post('/company-checks/:id/refresh', chLimiter, async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const db = getPool();
    try {
        const check = await getCheck(db, id);
        if (!check) return res.status(404).json({ ok: false, error: 'not_found' });
        const r = await refreshSnapshot(db, clientFactory(), check);
        await audit(db, admin(req).id, 'company_check_refresh', id, { changed: r.changedHash, partial_errors: r.snapshot.partial_errors.length });
        return res.json({ ok: true, data: { changed: r.changedHash } });
    } catch (e) {
        if (!(e instanceof ChError && e.code === 'rate_limited')) {
            await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [id, (e as Error).message.slice(0, 300)]).catch(() => {});
        }
        return chFailure(res, e);
    }
});

/** POST /:id/judgement { item, done, note } — the items that need a person. (Also at /checklist.) */
async function judgement(req: Request, res: Response) {
    const id = idParam(req);
    const item = text(req.body?.item, 60);
    const done = req.body?.done === true;
    const note = text(req.body?.note, 2000) || null;
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!JUDGEMENT_IDS.includes(item)) return res.status(400).json({ ok: false, error: 'invalid_item' });
    const db = getPool();
    try {
        const check = await getCheck(db, id);
        if (!check) return res.status(404).json({ ok: false, error: 'not_found' });
        if (check.status === 'satisfactory') return res.status(409).json({ ok: false, error: 'decided', message: 'Reopen the check before changing your judgement.' });
        if (done && item === 'warnings_reviewed' && !(note && note.length >= 10)) return res.status(400).json({ ok: false, error: 'note_required', message: 'Note what you concluded (at least 10 characters).' });
        const a = admin(req);
        await db.query(`UPDATE company_check SET checklist = jsonb_set(checklist, $2, $3::jsonb, true), updated_at = NOW() WHERE id = $1`,
            [id, `{${item}}`, JSON.stringify({ done, by: a.id, at: new Date().toISOString(), note })]);
        await audit(db, a.id, done ? 'company_check_item_done' : 'company_check_item_undone', id, { item, note });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
}
router.post('/company-checks/:id/judgement', judgement);
router.post('/company-checks/:id/checklist', judgement);

/** POST /:id/risk { rating: low|medium|high, reason } */
router.post('/company-checks/:id/risk', async (req, res) => {
    const id = idParam(req);
    const rating = text(req.body?.rating, 10);
    const reason = text(req.body?.reason, 1000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!['low', 'medium', 'high'].includes(rating)) return res.status(400).json({ ok: false, error: 'invalid_rating' });
    if (reason.length < 10) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Give the reason for the rating (at least 10 characters).' });
    const db = getPool();
    try {
        const check = await getCheck(db, id);
        if (!check) return res.status(404).json({ ok: false, error: 'not_found' });
        if (check.status === 'satisfactory') return res.status(409).json({ ok: false, error: 'decided', message: 'Reopen the check before changing the risk rating.' });
        await db.query(`UPDATE company_check SET risk_rating = $2, risk_reason = $3, updated_at = NOW() WHERE id = $1`, [id, rating, reason]);
        await audit(db, admin(req).id, 'company_check_risk_rated', id, { from: check.risk_rating, to: rating, reason });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/entries { kind: 'note'|'discrepancy', body, field?, chValue?, customerValue?, category? } */
router.post('/company-checks/:id/entries', async (req, res) => {
    const id = idParam(req);
    const kind = req.body?.kind === 'discrepancy' ? 'discrepancy' : req.body?.kind === 'note' ? 'note' : null;
    const body = text(req.body?.body, 4000);
    const category = kind === 'discrepancy' ? (req.body?.category === 'beneficial_ownership' ? 'beneficial_ownership' : 'other') : null;
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!kind) return res.status(400).json({ ok: false, error: 'invalid_kind' });
    if (!body) return res.status(400).json({ ok: false, error: 'body_required', message: 'Write the note or describe the discrepancy.' });
    const db = getPool();
    try {
        if (!(await getCheck(db, id))) return res.status(404).json({ ok: false, error: 'not_found' });
        const a = admin(req);
        const r = await db.query(
            `INSERT INTO company_check_entry (check_id, admin_id, kind, field, ch_value, customer_value, body, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [id, a.id, kind, text(req.body?.field, 120) || null, text(req.body?.chValue, 1000) || null, text(req.body?.customerValue, 1000) || null, body, category]);
        if (kind === 'discrepancy') {
            await db.query(`UPDATE company_check SET status = 'further_investigation', updated_at = NOW() WHERE id = $1 AND status = 'satisfactory'`, [id]);
        }
        await db.query(`UPDATE company_check SET updated_at = NOW() WHERE id = $1`, [id]);
        await audit(db, a.id, `company_check_${kind}_added`, id, { entry_id: Number(r.rows[0].id), field: text(req.body?.field, 120) || null, category });
        return res.status(201).json({ ok: true, data: { id: Number(r.rows[0].id) } });
    } catch (e) { return chFailure(res, e); }
});

/**
 * POST /:id/entries/:entryId/resolve { resolution, materiality?, reference? }
 * Beneficial-ownership discrepancies need a materiality decision (MLR reg 30A):
 *   material → must be reported to Companies House: the report reference is required
 *   not_material → the reason is required (at least 20 characters)
 *   register_corrected → the register has been corrected (refresh confirms it)
 * Other discrepancies are not reportable under reg 30A and are resolved with an explanation.
 */
router.post('/company-checks/:id/entries/:entryId/resolve', async (req, res) => {
    const id = idParam(req); const entryId = idParam(req, 'entryId');
    const resolution = text(req.body?.resolution, 2000);
    const reference = text(req.body?.reference, 120) || null;
    let materiality = text(req.body?.materiality, 30) || null;
    if (!id || !entryId) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!resolution) return res.status(400).json({ ok: false, error: 'resolution_required', message: 'Explain how the discrepancy was resolved.' });
    const db = getPool();
    try {
        const e = (await db.query(`SELECT kind, category, material, resolved_at FROM company_check_entry WHERE id = $1 AND check_id = $2`, [entryId, id])).rows[0];
        if (!e) return res.status(404).json({ ok: false, error: 'not_found' });
        if (e.kind !== 'discrepancy') return res.status(400).json({ ok: false, error: 'not_a_discrepancy' });
        if (e.resolved_at) return res.status(409).json({ ok: false, error: 'already_resolved' });
        const beneficial = e.category === 'beneficial_ownership' || (e.category == null && e.material === true);
        if (beneficial) {
            if (!['material', 'not_material', 'register_corrected'].includes(materiality ?? '')) {
                return res.status(400).json({ ok: false, error: 'materiality_required', message: 'Decide whether this beneficial-ownership discrepancy is material.' });
            }
            if (materiality === 'material' && !reference) return res.status(400).json({ ok: false, error: 'reference_required', message: 'A material discrepancy must be reported to Companies House (MLR reg 30A). Enter the report reference.' });
            if (materiality === 'not_material' && resolution.length < 20) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Explain why it is not material (at least 20 characters).' });
        } else {
            if (materiality === 'material') return res.status(400).json({ ok: false, error: 'not_reportable', message: 'Only beneficial-ownership (PSC) discrepancies are reported to Companies House.' });
            materiality = 'not_applicable';
        }
        const a = admin(req);
        await db.query(`UPDATE company_check_entry SET resolution = $3, materiality = $4, reported_to_ch = $5, report_reference = $6, resolved_by = $7, resolved_at = NOW() WHERE id = $1 AND check_id = $2`,
            [entryId, id, resolution, materiality, materiality === 'material', materiality === 'material' ? reference : null, a.id]);
        await audit(db, a.id, 'company_check_discrepancy_resolved', id, { entry_id: entryId, materiality, reference: materiality === 'material' ? reference : null });
        return res.json({ ok: true });
    } catch (err) { return chFailure(res, err); }
});

/** POST /:id/declaration/return { reason } — send the declaration back to the customer to correct. */
router.post('/company-checks/:id/declaration/return', async (req, res) => {
    const id = idParam(req);
    const reason = text(req.body?.reason, 1000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (reason.length < 10) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Tell the customer what to correct (at least 10 characters).' });
    const db = getPool();
    try {
        const check = await getCheck(db, id);
        if (!check) return res.status(404).json({ ok: false, error: 'not_found' });
        const latest = await latestDeclaration(db, Number(check.user_id), check.company_number);
        if (!latest || latest.returned_at) return res.status(409).json({ ok: false, error: 'nothing_to_return', message: 'There is no submitted declaration to return.' });
        const a = admin(req);
        await db.query(`UPDATE company_declaration SET returned_at = NOW(), returned_by = $2, returned_reason = $3 WHERE id = $1`, [latest.id, a.id, reason]);
        if (check.status === 'satisfactory') await db.query(`UPDATE company_check SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, [id]);
        await audit(db, a.id, 'company_check_declaration_returned', id, { declaration_id: Number(latest.id), reason });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

const MAX_EVIDENCE_BYTES = 3 * 1024 * 1024;
function sniff(buf: Buffer): { mime: string; ext: string } | null {
    if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
    return null;
}

/** POST /:id/evidence { kind, description, filename, dataBase64 } — PDF, PNG or JPEG up to 3 MB. */
router.post('/company-checks/:id/evidence', async (req, res) => {
    const id = idParam(req);
    const kind = text(req.body?.kind, 40);
    const description = text(req.body?.description, 500);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!['beneficial_ownership', 'discrepancy_report', 'company_document', 'other'].includes(kind)) return res.status(400).json({ ok: false, error: 'invalid_kind' });
    if (!description) return res.status(400).json({ ok: false, error: 'description_required', message: 'Describe what the document shows.' });
    const b64 = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';
    if (!b64 || b64.length > Math.ceil(MAX_EVIDENCE_BYTES * 4 / 3) + 4) return res.status(413).json({ ok: false, error: 'file_too_large', message: 'Files must be 3 MB or smaller.' });
    const buf = Buffer.from(b64, 'base64');
    const type = sniff(buf);
    if (!buf.length || buf.length > MAX_EVIDENCE_BYTES) return res.status(413).json({ ok: false, error: 'file_too_large', message: 'Files must be 3 MB or smaller.' });
    if (!type) return res.status(415).json({ ok: false, error: 'unsupported_file', message: 'Upload a PDF, PNG or JPEG.' });
    const base = text(req.body?.filename, 120).replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'evidence';
    const filename = `${base}.${type.ext}`;
    const db = getPool();
    try {
        if (!(await getCheck(db, id))) return res.status(404).json({ ok: false, error: 'not_found' });
        const a = admin(req);
        const sha = crypto.createHash('sha256').update(buf).digest('hex');
        const r = await db.query(
            `INSERT INTO company_check_evidence (check_id, admin_id, kind, description, filename, mime, size_bytes, sha256, bytes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [id, a.id, kind, description, filename, type.mime, buf.length, sha, buf]);
        await db.query(`UPDATE company_check SET updated_at = NOW() WHERE id = $1`, [id]);
        await audit(db, a.id, 'company_check_evidence_added', id, { evidence_id: Number(r.rows[0].id), kind, filename, sha256: sha, size_bytes: buf.length });
        return res.status(201).json({ ok: true, data: { id: Number(r.rows[0].id), sha256: sha } });
    } catch (e) { return chFailure(res, e); }
});

/** GET /:id/evidence/:evidenceId — download. */
router.get('/company-checks/:id/evidence/:evidenceId', async (req, res) => {
    const id = idParam(req); const eid = idParam(req, 'evidenceId');
    if (!id || !eid) return res.status(400).json({ ok: false, error: 'invalid_id' });
    try {
        const r = (await getPool().query(`SELECT filename, mime, bytes FROM company_check_evidence WHERE id = $1 AND check_id = $2`, [eid, id])).rows[0];
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        await audit(getPool(), admin(req).id, 'company_check_evidence_viewed', id, { evidence_id: eid });
        res.setHeader('Content-Type', r.mime);
        res.setHeader('Content-Disposition', `attachment; filename="${r.filename}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(Buffer.from(r.bytes));
    } catch (e) { return chFailure(res, e); }
});

/**
 * POST /:id/decision { status, reason } — complete the review (satisfactory) or move it to further
 * investigation / back to in progress. Each records a dated report. Satisfactory turns monitoring on.
 * Approval of the customer still needs identity, payment and every other condition (access rule).
 */
router.post('/company-checks/:id/decision', async (req, res) => {
    const id = idParam(req);
    const status = text(req.body?.status, 40);
    const reason = text(req.body?.reason, 2000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!['satisfactory', 'further_investigation', 'in_progress'].includes(status)) return res.status(400).json({ ok: false, error: 'invalid_status' });
    if (status !== 'satisfactory' && !reason) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Give a reason.' });
    const db = getPool();
    try {
        // Bring the comparison up to date before deciding.
        await syncDiscrepancies(db, id);
        const d = await detail(db, id);
        if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
        if (status === 'satisfactory' && d.blockers.length) return res.status(409).json({ ok: false, error: 'not_ready', message: d.blockers.join(' '), data: { blockers: d.blockers } });
        const a = admin(req);
        await db.query(
            `UPDATE company_check SET status = $2, decided_by = $3, decided_at = NOW(), decision_reason = $4,
                    monitoring = CASE WHEN $2 = 'satisfactory' THEN true ELSE monitoring END, updated_at = NOW() WHERE id = $1`,
            [id, status, a.id, reason || null]);
        await audit(db, a.id, 'company_check_decision', id, { from: d.check.status, to: status, reason: reason || null, risk_rating: d.check.risk_rating });
        const report = await saveReport(db, id, a, status === 'satisfactory' ? 'Review completed: satisfactory' : `Decision: ${status.replace(/_/g, ' ')}`);
        await audit(db, a.id, 'company_check_report_saved', id, { report_id: report.id, sha256: report.sha256 });
        return res.json({ ok: true, data: { status, report } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/reports { reason } — save a dated report now. */
router.post('/company-checks/:id/reports', async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const db = getPool();
    try {
        if (!(await getCheck(db, id))) return res.status(404).json({ ok: false, error: 'not_found' });
        const a = admin(req);
        const report = await saveReport(db, id, a, text(req.body?.reason, 300) || 'Saved by administrator');
        await audit(db, a.id, 'company_check_report_saved', id, { report_id: report.id, sha256: report.sha256 });
        return res.status(201).json({ ok: true, data: report });
    } catch (e) { return chFailure(res, e); }
});

/** GET /:id/reports/:reportId — PDF. */
router.get('/company-checks/:id/reports/:reportId', async (req, res) => {
    const id = idParam(req); const rid = idParam(req, 'reportId');
    if (!id || !rid) return res.status(400).json({ ok: false, error: 'invalid_id' });
    try {
        const r = (await getPool().query(
            `SELECT r.pdf, r.created_at, c.company_number FROM company_check_report r JOIN company_check c ON c.id = r.check_id WHERE r.id = $1 AND r.check_id = $2`, [rid, id])).rows[0];
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        await audit(getPool(), admin(req).id, 'company_check_report_viewed', id, { report_id: rid });
        const day = new Date(r.created_at).toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="company-check-${r.company_number}-${day}-${rid}.pdf"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.send(Buffer.from(r.pdf));
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/monitoring { enabled, reason } */
router.post('/company-checks/:id/monitoring', async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const enabled = req.body?.enabled === true;
    const reason = text(req.body?.reason, 500);
    if (!enabled && !reason) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Give a reason for turning monitoring off.' });
    const db = getPool();
    try {
        const r = await db.query(`UPDATE company_check SET monitoring = $2, updated_at = NOW() WHERE id = $1 RETURNING id`, [id, enabled]);
        if (!r.rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
        await audit(db, admin(req).id, enabled ? 'company_check_monitoring_on' : 'company_check_monitoring_off', id, { reason: reason || null });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/alerts/:alertId/ack { note } */
router.post('/company-checks/:id/alerts/:alertId/ack', async (req, res) => {
    const id = idParam(req); const aid = idParam(req, 'alertId');
    const note = text(req.body?.note, 2000);
    if (!id || !aid) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!note) return res.status(400).json({ ok: false, error: 'note_required', message: 'Record what you reviewed and what, if anything, you did.' });
    const db = getPool();
    try {
        const a = admin(req);
        const r = await db.query(`UPDATE company_check_alert SET acknowledged_by = $3, acknowledged_at = NOW(), note = $4 WHERE id = $1 AND check_id = $2 AND acknowledged_at IS NULL RETURNING id`,
            [aid, id, a.id, note]);
        if (!r.rows.length) return res.status(404).json({ ok: false, error: 'not_found_or_already_acknowledged' });
        await audit(db, a.id, 'company_check_alert_acknowledged', id, { alert_id: aid, note });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

export default router;
