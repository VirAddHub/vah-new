/**
 * Admin: identity results for a customer's account holder and business owners, independent of provider.
 * Mounted at /api/admin. Individual identity is separate from company checks.
 *
 * GET  /users/:id/identity  — current status of each person, recorded results, provider status
 * POST /users/:id/identity  — record a result an administrator established (manual document review).
 *      Requires a reference and notes; kept permanently (identity_check, cannot be edited) and audited.
 */
import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { getPool } from '../db';
import { param } from '../../lib/express-params';
import { logger } from '../../lib/logger';
import { identityProviderStatus } from '../services/identityVerification';
import { logVerificationEvent } from '../services/verificationEventLog';

const router = Router();
const idOf = (req: Request) => { const n = Number(param(req, 'id')); return Number.isSafeInteger(n) && n > 0 ? n : null; };
const t = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

router.get('/users/:id/identity', requireAdmin, async (req: Request, res: Response) => {
    const userId = idOf(req);
    if (!userId) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    try {
        const db = getPool();
        const u = (await db.query(`SELECT id, first_name, last_name, kyc_status, kyc_approved_at, identity_submitted_at FROM "user" WHERE id = $1`, [userId])).rows[0];
        if (!u) return res.status(404).json({ ok: false, error: 'user_not_found' });
        const owners = (await db.query(`SELECT id, full_name, email, role, status, requires_verification FROM business_owner WHERE user_id = $1 ORDER BY id`, [userId])).rows;
        const records = (await db.query(`SELECT id, subject, owner_id, outcome, method, reference, notes, admin_id, created_at FROM identity_check WHERE user_id = $1 ORDER BY id DESC`, [userId])).rows;
        return res.json({ ok: true, data: {
            account_holder: { name: [u.first_name, u.last_name].filter(Boolean).join(' '), status: u.kyc_status || 'not_started', approved_at: u.kyc_approved_at, submitted_at: u.identity_submitted_at },
            owners, records, provider: identityProviderStatus(),
        } });
    } catch (e) {
        logger.error('[admin-identity] get failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
});

router.post('/users/:id/identity', requireAdmin, async (req: Request, res: Response) => {
    const userId = idOf(req);
    const adminId = Number(req.user!.id);
    const subject = req.body?.subject === 'owner' ? 'owner' : req.body?.subject === 'account_holder' ? 'account_holder' : null;
    const outcome = req.body?.outcome === 'verified' || req.body?.outcome === 'rejected' ? req.body.outcome : null;
    const ownerId = subject === 'owner' ? Number(req.body?.ownerId) : null;
    const reference = t(req.body?.reference, 120);
    const notes = t(req.body?.notes, 2000);
    if (!userId) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    if (!subject || !outcome) return res.status(400).json({ ok: false, error: 'invalid_request', message: 'Choose who and the outcome.' });
    if (subject === 'owner' && !(Number.isSafeInteger(ownerId) && ownerId! > 0)) return res.status(400).json({ ok: false, error: 'invalid_owner' });
    if (notes.length < 10) return res.status(400).json({ ok: false, error: 'notes_required', message: 'Describe the documents you checked and how (at least 10 characters).' });
    if (!reference) return res.status(400).json({ ok: false, error: 'reference_required', message: 'Enter a reference for where the documents are kept.' });
    const db = await getPool().connect();
    try {
        await db.query('BEGIN');
        if (subject === 'owner') {
            const r = await db.query(`UPDATE business_owner SET status = $3, kyc_updated_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id`,
                [ownerId, userId, outcome === 'verified' ? 'verified' : 'rejected']);
            if (!r.rows.length) { await db.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'owner_not_found' }); }
        } else {
            const r = await db.query(
                `UPDATE "user" SET kyc_status = $2, kyc_approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE kyc_approved_at END,
                        kyc_rejection_reason = CASE WHEN $2 = 'rejected' THEN $3 ELSE NULL END,
                        identity_submitted_at = COALESCE(identity_submitted_at, NOW()), updated_at = $4
                  WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
                [userId, outcome === 'verified' ? 'approved' : 'rejected', outcome === 'rejected' ? notes : null, Date.now()]);
            if (!r.rows.length) { await db.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'user_not_found' }); }
        }
        const rec = await db.query(
            `INSERT INTO identity_check (user_id, owner_id, subject, outcome, method, reference, notes, admin_id) VALUES ($1,$2,$3,$4,'manual_documents',$5,$6,$7) RETURNING id`,
            [userId, ownerId, subject, outcome, reference, notes, adminId]);
        await db.query(`INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, 'identity_result_recorded', 'user', $2, $3, NOW())`,
            [adminId, userId, JSON.stringify({ identity_check_id: Number(rec.rows[0].id), subject, owner_id: ownerId, outcome, method: 'manual_documents', reference })]);
        await db.query('COMMIT');
        await logVerificationEvent(subject === 'owner' ? 'business_owner' : 'user', subject === 'owner' ? ownerId! : userId, outcome === 'verified' ? 'verified' : 'rejected', { method: 'manual_documents' });
        return res.status(201).json({ ok: true, data: { id: Number(rec.rows[0].id) } });
    } catch (e) {
        await db.query('ROLLBACK').catch(() => undefined);
        logger.error('[admin-identity] record failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error', message: 'Nothing was recorded. Try again.' });
    } finally {
        db.release();
    }
});

export default router;
