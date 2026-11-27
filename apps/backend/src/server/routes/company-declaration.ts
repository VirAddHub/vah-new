/**
 * Customer company declaration. Mounted at /api/account/company-declaration.
 *
 * GET  — what we need from the customer (company number, current declaration, whether it can be edited)
 * POST — submit the declaration. Allowed once, and again only after an administrator returns it.
 *        On submit: the people the customer names who need identity verification are added as
 *        business owners (invited by email), the company check is created if needed, and the
 *        Companies House comparison runs.
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getPool } from '../db';
import { logger } from '../../lib/logger';
import { DeclarationSchema, declarationTarget, isBeneficialOwner, latestDeclaration } from '../services/companyChecks/declaration';
import { ensureCheck, refreshSnapshot, syncDiscrepancies, SYSTEM, audit } from '../services/companyChecks/store';
import { chClient } from '../services/companyChecks/chClient';
import { sameName } from '../services/companyChecks/snapshot';
import * as businessOwnersService from '../services/businessOwners';
import { DEADLINE_DAYS, isCompanyType, latestPreIncorporation, parseProposed, tableReady } from '../services/companyChecks/preIncorporation';

/** Directors and beneficial owners other than the account holder are asked to verify their identity. */
async function inviteNamedPeople(db: any, userId: number, people: any[], companyName: string | undefined) {
    const existing = (await db.query(`SELECT full_name, email FROM business_owner WHERE user_id = $1`, [userId])).rows;
    const invited: string[] = [];
    for (const p of people.filter(x => !x.is_account_holder && (x.is_director || isBeneficialOwner(x)) && x.email)) {
        if (existing.some((o: any) => o.email === p.email || sameName(o.full_name, p.full_name))) continue;
        try {
            await businessOwnersService.createBusinessOwner(userId, p.full_name, p.email!, isBeneficialOwner(p) ? 'psc' : 'director', companyName);
            invited.push(p.full_name);
        } catch (e) {
            logger.warn('[company-declaration] owner not added', { message: (e as Error)?.message });
        }
    }
    return invited;
}

async function holderName(db: any, userId: number) {
    const u = (await db.query(`SELECT first_name, last_name, email, business_type FROM "user" WHERE id = $1`, [userId])).rows[0];
    return { full_name: [u?.first_name, u?.last_name].filter(Boolean).join(' '), email: u?.email, business_type: u?.business_type };
}

const router = Router();
router.use('/company-declaration', requireAuth);

router.get('/company-declaration', async (req: Request, res: Response) => {
    const userId = Number(req.user!.id);
    try {
        const db = getPool();
        const target = await declarationTarget(db, userId);
        if (!target) {
            const h = await holderName(db, userId);
            if (!isCompanyType(h.business_type) || !(await tableReady(db))) return res.json({ ok: true, data: { required: false } });
            const p = await latestPreIncorporation(db, userId);
            return res.json({ ok: true, data: {
                required: true, mode: 'proposed', account_holder: { full_name: h.full_name, email: h.email }, deadline_days: DEADLINE_DAYS,
                pre_incorporation: p ? { status: p.status, proposed_name: p.proposed_name, submitted_at: p.submitted_at, deadline_at: p.deadline_at,
                    reason: ['returned', 'refused'].includes(p.status) ? p.decision_reason : null } : null,
                declaration: p ? { data: p.declaration, submitted_at: p.submitted_at, returned_at: p.status === 'returned' ? p.decided_at : null, returned_reason: p.status === 'returned' ? p.decision_reason : null } : null,
                editable: !p || p.status === 'returned',
            } });
        }
        const latest = await latestDeclaration(db, userId, target.company_number);
        const u = (await db.query(`SELECT first_name, last_name, email FROM "user" WHERE id = $1`, [userId])).rows[0];
        return res.json({ ok: true, data: {
            required: true, mode: 'company', company_number: target.company_number, company_name: target.company_name,
            account_holder: { full_name: [u?.first_name, u?.last_name].filter(Boolean).join(' '), email: u?.email },
            declaration: latest ? { data: latest.data, submitted_at: latest.submitted_at, returned_at: latest.returned_at, returned_reason: latest.returned_reason } : null,
            editable: !latest || !!latest.returned_at,
        } });
    } catch (e) {
        logger.error('[company-declaration] get failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
});

router.post('/company-declaration', async (req: Request, res: Response) => {
    const userId = Number(req.user!.id);
    const db0 = getPool();
    try {
        if (!(await declarationTarget(db0, userId))) {
            const h = await holderName(db0, userId);
            if (isCompanyType(h.business_type) && (await tableReady(db0))) return submitProposed(req, res, userId, h);
        }
    } catch (e) {
        logger.error('[company-declaration] proposed submit failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error', message: 'We could not save your details. Nothing was submitted; please try again.' });
    }
    const parsed = DeclarationSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: parsed.error.issues.map(i => i.message).join('. '),
            issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
    }
    const db = getPool();
    try {
        const target = await declarationTarget(db, userId);
        if (!target) return res.status(400).json({ ok: false, error: 'no_company', message: 'There is no company number on your account.' });
        const latest = await latestDeclaration(db, userId, target.company_number);
        if (latest && !latest.returned_at) {
            return res.status(409).json({ ok: false, error: 'already_submitted', message: 'You have already submitted your company details. Contact support to change them.' });
        }
        const data = parsed.data;
        const u = (await db.query(`SELECT first_name, last_name, email FROM "user" WHERE id = $1`, [userId])).rows[0];
        const holder = [u?.first_name, u?.last_name].filter(Boolean).join(' ');
        const self = data.people.find(p => p.is_account_holder)!;
        if (holder && !sameName(self.full_name, holder)) {
            return res.status(400).json({ ok: false, error: 'validation_error', message: `Your own entry must be in the name on your account (${holder}).` });
        }
        const ins = await db.query(`INSERT INTO company_declaration (user_id, company_number, data) VALUES ($1, $2, $3) RETURNING id, submitted_at`,
            [userId, target.company_number, JSON.stringify(data)]);
        await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('company_declaration', $1, 'company_declaration_submitted', $2, NOW())`,
            [String(ins.rows[0].id), JSON.stringify({ user_id: userId, company_number: target.company_number, resubmission: !!latest })]);

        const invited = await inviteNamedPeople(db, userId, data.people, target.company_name ?? undefined);

        // Create the company check and compare straight away (best effort: the hourly sweep retries).
        const { check } = await ensureCheck(db, userId, target.company_number, null);
        try {
            if (!check.snapshot && process.env.COMPANIES_HOUSE_API_KEY) await refreshSnapshot(db, chClient(), check);
            else await syncDiscrepancies(db, Number(check.id));
        } catch (e) {
            await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]).catch(() => {});
        }
        await audit(db, SYSTEM, 'company_check_declaration_received', Number(check.id), { declaration_id: Number(ins.rows[0].id), owners_invited: invited.length });
        return res.status(201).json({ ok: true, data: { submitted_at: ins.rows[0].submitted_at, owners_invited: invited } });
    } catch (e) {
        logger.error('[company-declaration] submit failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error', message: 'We could not save your details. Nothing was submitted; please try again.' });
    }
});

/** Proposed company (pre-incorporation): one open application per customer; returned ones are corrected in place. */
async function submitProposed(req: Request, res: Response, userId: number, h: { full_name: string }) {
    const parsed = parseProposed(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: 'validation_error', message: parsed.issues.map(i => i.message).join('. '), issues: parsed.issues });
    const self = parsed.declaration.people.find((p: any) => p.is_account_holder);
    if (h.full_name && !sameName(self.full_name, h.full_name)) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: `Your own entry must be in the name on your account (${h.full_name}).` });
    }
    const db = getPool();
    const p = await latestPreIncorporation(db, userId);
    if (p && !['returned', 'refused', 'lapsed', 'incorporated'].includes(p.status)) {
        return res.status(409).json({ ok: false, error: 'already_submitted', message: 'You have already told us about your proposed company. Contact support to change it.' });
    }
    if (p?.status === 'refused') return res.status(409).json({ ok: false, error: 'refused', message: 'We cannot accept this application. Contact support.' });
    let id: number;
    if (p?.status === 'returned') {
        await db.query(`UPDATE pre_incorporation SET proposed_name = $2, declaration = $3, status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [p.id, parsed.name, JSON.stringify(parsed.declaration)]);
        id = Number(p.id);
    } else {
        id = Number((await db.query(`INSERT INTO pre_incorporation (user_id, proposed_name, declaration) VALUES ($1, $2, $3) RETURNING id`,
            [userId, parsed.name, JSON.stringify(parsed.declaration)])).rows[0].id);
    }
    // Keep each submission: the earlier version is in the audit record.
    await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('pre_incorporation', $1, 'pre_incorporation_submitted', $2, NOW())`,
        [String(id), JSON.stringify({ user_id: userId, proposed_name: parsed.name, resubmission: p?.status === 'returned', previous: p?.status === 'returned' ? p.declaration : undefined })]);
    const invited = await inviteNamedPeople(db, userId, parsed.declaration.people, parsed.name);
    return res.status(201).json({ ok: true, data: { submitted: true, owners_invited: invited } });
}

export default router;
