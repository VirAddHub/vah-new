/**
 * Admin "Company checks": company due diligence with the Companies House public data API.
 * Mounted at /api/admin/company-checks. Every route requires an administrator; every change is
 * written to admin_audit (target_type 'company_check').
 *
 * Individual identity, address, PEP, sanctions and adverse-media checks are deliberately not here.
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { requireAdmin } from '../../middleware/auth';
import { getPool } from '../db';
import { logger } from '../../lib/logger';
import { param } from '../../lib/express-params';
import { ChError, createChClient, normaliseCompanyNumber, searchCompanies, type ChClient } from '../services/companyChecks/chClient';
import { CHECKLIST, CHECKLIST_IDS, satisfactoryBlockers } from '../services/companyChecks/analysis';
import { audit, detail, getCheck, loadCustomer, refreshSnapshot, saveReport } from '../services/companyChecks/store';

let clientFactory: () => ChClient = () => createChClient();
/** For tests: replace the Companies House client. */
export function setChClientFactory(f: () => ChClient) { clientFactory = f; }

const router = Router();
router.use('/company-checks', requireAdmin);

// Calls that reach Companies House share the key's 600-per-5-minutes allowance with public search.
const chLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req: Request) => `admin:${(req as any).user?.id ?? 'unknown'}`,
    message: { ok: false, error: 'rate_limited', message: 'Too many Companies House requests. Wait a few minutes.' },
});

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

/** GET /summary — counts for the admin navigation badge. */
router.get('/company-checks/summary', async (_req, res) => {
    try {
        const r = (await getPool().query(`
            SELECT (SELECT COUNT(*)::int FROM company_check_alert WHERE acknowledged_at IS NULL) AS open_alerts,
                   (SELECT COUNT(*)::int FROM company_check WHERE status <> 'satisfactory') AS open_checks`)).rows[0];
        return res.json({ ok: true, data: r });
    } catch (e) { return chFailure(res, e); }
});

/** GET / — checks list. ?status=in_progress|further_investigation|satisfactory|alerts&q=&user_id= */
router.get('/company-checks', async (req, res) => {
    const status = text(req.query.status, 40);
    const q = text(req.query.q, 100);
    const userId = Number(req.query.user_id) || null;
    const where: string[] = []; const args: unknown[] = [];
    if (['in_progress', 'further_investigation', 'satisfactory'].includes(status)) { args.push(status); where.push(`c.status = $${args.length}`); }
    if (status === 'alerts') where.push(`EXISTS (SELECT 1 FROM company_check_alert a WHERE a.check_id = c.id AND a.acknowledged_at IS NULL)`);
    if (userId) { args.push(userId); where.push(`c.user_id = $${args.length}`); }
    if (q) { args.push(`%${q.replace(/[%_\\]/g, m => '\\' + m)}%`); where.push(`(c.company_name ILIKE $${args.length} OR c.company_number ILIKE $${args.length} OR u.email ILIKE $${args.length})`); }
    try {
        const r = await getPool().query(`
            SELECT c.id, c.user_id, u.email, c.company_number, c.company_name, c.status, c.monitoring, c.fetched_at, c.decided_at, c.updated_at,
                   (SELECT COUNT(*)::int FROM jsonb_each(c.checklist) j WHERE (j.value->>'done')::boolean) AS checklist_done,
                   (SELECT COUNT(*)::int FROM company_check_alert a WHERE a.check_id = c.id AND a.acknowledged_at IS NULL) AS open_alerts
              FROM company_check c JOIN "user" u ON u.id = c.user_id
             ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
             ORDER BY (SELECT COUNT(*) FROM company_check_alert a WHERE a.check_id = c.id AND a.acknowledged_at IS NULL) DESC, c.updated_at DESC
             LIMIT 200`, args);
        return res.json({ ok: true, data: { items: r.rows, checklist_total: CHECKLIST.length } });
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
        const businesses = (await getPool().query(`SELECT id, company_name, companies_house_number, is_primary FROM business WHERE user_id = $1 ORDER BY is_primary DESC, id`, [userId])).rows;
        return res.json({ ok: true, data: { customer: c, checks, businesses } });
    } catch (e) { return chFailure(res, e); }
});

/** POST / { userId, companyNumber, businessId? } — link a company to a customer and fetch the register extract. */
router.post('/company-checks', chLimiter, async (req, res) => {
    const a = admin(req);
    const userId = Number(req.body?.userId);
    const number = normaliseCompanyNumber(req.body?.companyNumber);
    const businessId = req.body?.businessId ? Number(req.body.businessId) : null;
    if (!Number.isSafeInteger(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    if (!number) return res.status(400).json({ ok: false, error: 'invalid_company_number', message: 'Enter a valid company number.' });
    const db = getPool();
    try {
        const customer = await loadCustomer(db, userId);
        if (!customer) return res.status(404).json({ ok: false, error: 'user_not_found' });
        if (businessId) {
            const b = await db.query(`SELECT 1 FROM business WHERE id = $1 AND user_id = $2`, [businessId, userId]);
            if (!b.rows.length) return res.status(400).json({ ok: false, error: 'business_not_owned', message: 'That business does not belong to this customer.' });
        }
        const existing = (await db.query(`SELECT id FROM company_check WHERE user_id = $1 AND company_number = $2`, [userId, number])).rows[0];
        if (existing) return res.status(409).json({ ok: false, error: 'already_linked', message: 'This company is already linked to the customer.', data: { id: Number(existing.id) } });
        const ins = await db.query(
            `INSERT INTO company_check (user_id, business_id, company_number, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, businessId, number, a.id]);
        const check = ins.rows[0];
        await audit(db, a.id, 'company_check_link', Number(check.id), { user_id: userId, company_number: number, business_id: businessId });
        try {
            await refreshSnapshot(db, clientFactory(), check);
        } catch (e) {
            // The link stays; the extract can be retrieved again. Record why it failed.
            await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]);
            if (e instanceof ChError && e.code === 'not_found') {
                return res.status(201).json({ ok: true, data: { id: Number(check.id) }, warning: 'Company not found at Companies House. Check the number.' });
            }
            return res.status(201).json({ ok: true, data: { id: Number(check.id) }, warning: (e as Error).message });
        }
        return res.status(201).json({ ok: true, data: { id: Number(check.id) } });
    } catch (e) { return chFailure(res, e); }
});

/** GET /:id — everything for one check. */
router.get('/company-checks/:id', async (req, res) => {
    const id = idParam(req);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    try {
        const d = await detail(getPool(), id);
        if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
        const entries = d.entries;
        const blockers = satisfactoryBlockers({
            checklist: d.check.checklist || {}, fetchedAt: d.check.fetched_at, hasSnapshot: !!d.check.snapshot,
            partialErrors: d.check.snapshot?.partial_errors?.length ?? 0,
            unresolvedDiscrepancies: entries.filter((e: any) => e.kind === 'discrepancy' && !e.resolved_at).length,
            beneficialOwnerEvidence: d.evidence.filter((e: any) => e.kind === 'beneficial_ownership').length,
        });
        return res.json({ ok: true, data: { ...d, checklist_items: CHECKLIST, satisfactory_blockers: blockers } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/refresh — retrieve the register extract again. */
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

/** POST /:id/checklist { item, done, note } */
router.post('/company-checks/:id/checklist', async (req, res) => {
    const id = idParam(req);
    const item = text(req.body?.item, 60);
    const done = req.body?.done === true;
    const note = text(req.body?.note, 2000) || null;
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!CHECKLIST_IDS.includes(item)) return res.status(400).json({ ok: false, error: 'invalid_item' });
    const db = getPool();
    try {
        const check = await getCheck(db, id);
        if (!check) return res.status(404).json({ ok: false, error: 'not_found' });
        if (check.status === 'satisfactory') return res.status(409).json({ ok: false, error: 'decided', message: 'Reopen the check before changing the checklist.' });
        if (done && item === 'register_extract' && !check.snapshot) return res.status(400).json({ ok: false, error: 'no_extract', message: 'Retrieve the Companies House extract first.' });
        const a = admin(req);
        const value = done ? { done: true, by: a.id, at: new Date().toISOString(), note } : { done: false, by: a.id, at: new Date().toISOString(), note };
        await db.query(`UPDATE company_check SET checklist = jsonb_set(checklist, $2, $3::jsonb, true), updated_at = NOW() WHERE id = $1`,
            [id, `{${item}}`, JSON.stringify(value)]);
        await audit(db, a.id, done ? 'company_check_item_done' : 'company_check_item_undone', id, { item, note });
        return res.json({ ok: true });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/entries { kind: 'note'|'discrepancy', body, field?, chValue?, customerValue?, material? } */
router.post('/company-checks/:id/entries', async (req, res) => {
    const id = idParam(req);
    const kind = req.body?.kind === 'discrepancy' ? 'discrepancy' : req.body?.kind === 'note' ? 'note' : null;
    const body = text(req.body?.body, 4000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!kind) return res.status(400).json({ ok: false, error: 'invalid_kind' });
    if (!body) return res.status(400).json({ ok: false, error: 'body_required', message: 'Write the note or describe the discrepancy.' });
    const db = getPool();
    try {
        if (!(await getCheck(db, id))) return res.status(404).json({ ok: false, error: 'not_found' });
        const a = admin(req);
        const r = await db.query(
            `INSERT INTO company_check_entry (check_id, admin_id, kind, field, ch_value, customer_value, material, body) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [id, a.id, kind, text(req.body?.field, 120) || null, text(req.body?.chValue, 1000) || null, text(req.body?.customerValue, 1000) || null,
                kind === 'discrepancy' ? req.body?.material === true : null, body]);
        // A new discrepancy re-opens a satisfactory check: service pauses until it is reviewed.
        if (kind === 'discrepancy') {
            await db.query(`UPDATE company_check SET status = 'further_investigation', updated_at = NOW() WHERE id = $1 AND status = 'satisfactory'`, [id]);
        }
        await db.query(`UPDATE company_check SET updated_at = NOW() WHERE id = $1`, [id]);
        await audit(db, a.id, `company_check_${kind}_added`, id, { entry_id: Number(r.rows[0].id), field: text(req.body?.field, 120) || null, material: kind === 'discrepancy' ? req.body?.material === true : null });
        return res.status(201).json({ ok: true, data: { id: Number(r.rows[0].id) } });
    } catch (e) { return chFailure(res, e); }
});

/** POST /:id/entries/:entryId/resolve { resolution, reportedToCh, reference } */
router.post('/company-checks/:id/entries/:entryId/resolve', async (req, res) => {
    const id = idParam(req); const entryId = idParam(req, 'entryId');
    const resolution = text(req.body?.resolution, 2000);
    const reported = req.body?.reportedToCh === true;
    const reference = text(req.body?.reference, 120) || null;
    if (!id || !entryId) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!resolution) return res.status(400).json({ ok: false, error: 'resolution_required', message: 'Explain how the discrepancy was resolved.' });
    if (reported && !reference) return res.status(400).json({ ok: false, error: 'reference_required', message: 'Enter the Companies House report reference.' });
    const db = getPool();
    try {
        const e = (await db.query(`SELECT kind, material, resolved_at FROM company_check_entry WHERE id = $1 AND check_id = $2`, [entryId, id])).rows[0];
        if (!e) return res.status(404).json({ ok: false, error: 'not_found' });
        if (e.kind !== 'discrepancy') return res.status(400).json({ ok: false, error: 'not_a_discrepancy' });
        if (e.resolved_at) return res.status(409).json({ ok: false, error: 'already_resolved' });
        if (e.material && !reported) return res.status(400).json({ ok: false, error: 'material_needs_report', message: 'A material discrepancy must be reported to Companies House (MLR reg 30A) before it is resolved.' });
        const a = admin(req);
        await db.query(`UPDATE company_check_entry SET resolution = $3, reported_to_ch = $4, report_reference = $5, resolved_by = $6, resolved_at = NOW() WHERE id = $1 AND check_id = $2`,
            [entryId, id, resolution, reported, reference, a.id]);
        await audit(db, a.id, 'company_check_discrepancy_resolved', id, { entry_id: entryId, reported_to_ch: reported, reference });
        return res.json({ ok: true });
    } catch (err) { return chFailure(res, err); }
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

/** POST /:id/decision { status, reason } — records the outcome and saves a dated report. */
router.post('/company-checks/:id/decision', async (req, res) => {
    const id = idParam(req);
    const status = text(req.body?.status, 40);
    const reason = text(req.body?.reason, 2000);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!['satisfactory', 'further_investigation', 'in_progress'].includes(status)) return res.status(400).json({ ok: false, error: 'invalid_status' });
    if (status !== 'satisfactory' && !reason) return res.status(400).json({ ok: false, error: 'reason_required', message: 'Give a reason.' });
    const db = getPool();
    try {
        const d = await detail(db, id);
        if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
        if (status === 'satisfactory') {
            const blockers = satisfactoryBlockers({
                checklist: d.check.checklist || {}, fetchedAt: d.check.fetched_at, hasSnapshot: !!d.check.snapshot,
                partialErrors: d.check.snapshot?.partial_errors?.length ?? 0,
                unresolvedDiscrepancies: d.entries.filter((e: any) => e.kind === 'discrepancy' && !e.resolved_at).length,
                beneficialOwnerEvidence: d.evidence.filter((e: any) => e.kind === 'beneficial_ownership').length,
            });
            if (blockers.length) return res.status(409).json({ ok: false, error: 'not_ready', message: blockers.join(' '), data: { blockers } });
        }
        const a = admin(req);
        // Monitoring starts when a check is satisfactory and stays on afterwards unless turned off.
        await db.query(
            `UPDATE company_check SET status = $2, decided_by = $3, decided_at = NOW(), decision_reason = $4,
                    monitoring = CASE WHEN $2 = 'satisfactory' THEN true ELSE monitoring END, updated_at = NOW() WHERE id = $1`,
            [id, status, a.id, reason || null]);
        await audit(db, a.id, 'company_check_decision', id, { from: d.check.status, to: status, reason: reason || null });
        const report = await saveReport(db, id, a, `Decision: ${status.replace(/_/g, ' ')}`);
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
