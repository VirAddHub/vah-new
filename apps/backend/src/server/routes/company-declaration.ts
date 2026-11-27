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
import { createChClient } from '../services/companyChecks/chClient';
import { sameName } from '../services/companyChecks/snapshot';
import * as businessOwnersService from '../services/businessOwners';

const router = Router();
router.use('/company-declaration', requireAuth);

router.get('/company-declaration', async (req: Request, res: Response) => {
    const userId = Number(req.user!.id);
    try {
        const db = getPool();
        const target = await declarationTarget(db, userId);
        if (!target) return res.json({ ok: true, data: { required: false } });
        const latest = await latestDeclaration(db, userId, target.company_number);
        const u = (await db.query(`SELECT first_name, last_name, email FROM "user" WHERE id = $1`, [userId])).rows[0];
        return res.json({ ok: true, data: {
            required: true, company_number: target.company_number, company_name: target.company_name,
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

        // People who need their own identity verification: directors and beneficial owners other than the account holder.
        const existing = (await db.query(`SELECT full_name, email FROM business_owner WHERE user_id = $1`, [userId])).rows;
        const invited: string[] = [];
        for (const p of data.people.filter(x => !x.is_account_holder && (x.is_director || isBeneficialOwner(x)) && x.email)) {
            if (existing.some((o: any) => o.email === p.email || sameName(o.full_name, p.full_name))) continue;
            try {
                await businessOwnersService.createBusinessOwner(userId, p.full_name, p.email!, isBeneficialOwner(p) ? 'psc' : 'director', target.company_name ?? undefined);
                invited.push(p.full_name);
            } catch (e) {
                logger.warn('[company-declaration] owner not added', { message: (e as Error)?.message });
            }
        }

        // Create the company check and compare straight away (best effort: the hourly sweep retries).
        const { check } = await ensureCheck(db, userId, target.company_number, null);
        try {
            if (!check.snapshot && process.env.COMPANIES_HOUSE_API_KEY) await refreshSnapshot(db, createChClient(), check);
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

export default router;
