/**
 * The single access decision.
 *
 * Three independent facts, each with one source:
 *   standing      user.status / suspended_at / deleted_at     changed only by an admin
 *   payment       subscription row (Stripe events only)
 *   verification  primary identity + every required business owner (Sumsub events, admin override)
 *
 * Three access levels:
 *   none        cannot sign in (suspended or closed)
 *   onboarding  can sign in, pay, verify, manage owners, billing, settings, support
 *   full        onboarding + address, certificate, mail, scans, downloads, forwarding
 *
 * This is the application's access rule. It is not a statement of regulatory compliance:
 * mandatory checks that are still undecided are listed in audit/DECISIONS.md (deferred decisions).
 */
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db';
import { logger } from '../../lib/logger';

export type AccessLevel = 'none' | 'onboarding' | 'full';
export type Standing = 'good' | 'suspended' | 'closed';
export type PaymentState = 'none' | 'active' | 'past_due' | 'cancelled' | 'pending';
export type VerificationState = 'not_started' | 'in_review' | 'action_required' | 'rejected' | 'owners_pending' | 'complete';
export type MissingReason = 'account_suspended' | 'account_closed' | 'payment_required' | 'payment_overdue'
    | 'subscription_cancelled' | 'identity_required' | 'identity_in_review' | 'identity_rejected' | 'owners_required';
export type NextStep = 'none' | 'payment' | 'billing' | 'verification' | 'owners' | 'support' | 'mail';

export interface AccessDecision {
    level: AccessLevel;
    standing: Standing;
    payment: { state: PaymentState; entitled: boolean; paidThroughMs: number | null; cancelAtPeriodEnd: boolean };
    verification: { state: VerificationState; primaryApproved: boolean; pendingOwners: number };
    missing: MissingReason[];
    next: NextStep;
}

type Queryable = { query: (sql: string, args?: unknown[]) => Promise<{ rows: any[] }> };

export function standingOf(u: { status?: string | null; deleted_at?: unknown; suspended_at?: unknown }): Standing {
    const status = String(u.status || '').toLowerCase();
    if (u.deleted_at != null || status === 'closed' || status === 'deleted') return 'closed';
    if (u.suspended_at != null || status === 'suspended') return 'suspended';
    return 'good';
}

/**
 * Paid entitlement. `active` is only ever written from a Stripe event that reports a paid or
 * active subscription. `past_due` keeps service only until the end of the period already paid for.
 * There is no grace period. `cancelled` is never entitled.
 */
export function paymentOf(sub: any | undefined, nowMs: number): AccessDecision['payment'] {
    if (!sub) return { state: 'none', entitled: false, paidThroughMs: null, cancelAtPeriodEnd: false };
    const raw = String(sub.status || '').toLowerCase();
    const state: PaymentState = raw === 'active' || raw === 'past_due' || raw === 'cancelled' ? raw : 'pending';
    const paidThroughMs = sub.paid_through_ms != null ? Number(sub.paid_through_ms) : null;
    const hasStripe = !!sub.stripe_subscription_id;
    const entitled = hasStripe && (state === 'active' || (state === 'past_due' && paidThroughMs != null && paidThroughMs > nowMs));
    return { state, entitled, paidThroughMs, cancelAtPeriodEnd: sub.cancel_at_period_end === true };
}

export function verificationOf(kycStatus: string | null | undefined, pendingOwners: number, hasSubmitted = true): AccessDecision['verification'] {
    const k = String(kycStatus || '').toLowerCase();
    const primaryApproved = k === 'approved' || k === 'verified';
    let state: VerificationState;
    if (primaryApproved) state = pendingOwners > 0 ? 'owners_pending' : 'complete';
    else if (k === 'rejected') state = 'rejected';
    else if (k === 'action_required' || k === 'retry') state = 'action_required';
    // Signup writes 'pending' before anything has been submitted; it only means "in review" once
    // the customer has an identity-check applicant.
    else if (k === 'in_progress' || k === 'in_review' || (k === 'pending' && hasSubmitted)) state = 'in_review';
    else state = 'not_started';
    return { state, primaryApproved, pendingOwners };
}

export function decide(standing: Standing, payment: AccessDecision['payment'], verification: AccessDecision['verification']): AccessDecision {
    const missing: MissingReason[] = [];
    if (standing !== 'good') {
        missing.push(standing === 'closed' ? 'account_closed' : 'account_suspended');
        return { level: 'none', standing, payment, verification, missing, next: 'none' };
    }
    if (!payment.entitled) {
        missing.push(payment.state === 'past_due' ? 'payment_overdue' : payment.state === 'cancelled' ? 'subscription_cancelled' : 'payment_required');
    }
    switch (verification.state) {
        case 'complete': break;
        case 'owners_pending': missing.push('owners_required'); break;
        case 'rejected': missing.push('identity_rejected'); break;
        case 'in_review': missing.push('identity_in_review'); break;
        default: missing.push('identity_required');
    }
    let next: NextStep = 'mail';
    if (missing.includes('payment_required')) next = 'payment';
    else if (missing.includes('payment_overdue') || missing.includes('subscription_cancelled')) next = 'billing';
    else if (missing.includes('identity_rejected')) next = 'support';
    else if (missing.includes('identity_required') || missing.includes('identity_in_review')) next = 'verification';
    else if (missing.includes('owners_required')) next = 'owners';
    return { level: missing.length === 0 ? 'full' : 'onboarding', standing, payment, verification, missing, next };
}

export async function getAccess(userId: number, db: Queryable = getPool(), nowMs: number = Date.now()): Promise<AccessDecision | null> {
    const u = await db.query(
        `SELECT id, status, deleted_at, suspended_at, kyc_status, sumsub_applicant_id FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    if (u.rows.length === 0) return null;
    const s = await db.query(
        `SELECT status, stripe_subscription_id, paid_through_ms, cancel_at_period_end FROM subscription WHERE user_id = $1 LIMIT 1`, [userId]);
    const o = await db.query(
        `SELECT COUNT(*)::int AS n FROM business_owner WHERE user_id = $1 AND requires_verification = true AND status <> 'verified'`, [userId]);
    return decide(standingOf(u.rows[0]), paymentOf(s.rows[0], nowMs), verificationOf(u.rows[0].kyc_status, Number(o.rows[0]?.n || 0), !!u.rows[0].sumsub_applicant_id));
}

/** Number of mail items held for a customer who is not in full service. A count only: no details. */
export async function heldMailCount(userId: number, db: Queryable = getPool()): Promise<number> {
    const r = await db.query(`SELECT COUNT(*)::int AS n FROM mail_item WHERE user_id = $1 AND deleted = false`, [userId]).catch(() => ({ rows: [{ n: 0 }] }));
    return Number(r.rows[0]?.n || 0);
}

/**
 * Gate for every route that exposes the service itself: mail listings, item details, scans,
 * downloads, forwarding, the registered address and the certificate. Admins pass.
 */
export function requireFullService(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, error: 'unauthenticated' });
    if (user.is_admin) return next();
    getAccess(Number(user.id)).then(access => {
        if (!access) return res.status(401).json({ ok: false, error: 'unauthenticated' });
        if (access.level === 'full') return next();
        return res.status(403).json({
            ok: false,
            error: 'service_restricted',
            message: 'Finish the outstanding steps on your account to use this part of the service.',
            missing: access.missing,
            next: access.next,
        });
    }).catch(err => {
        logger.error('[access] decision_failed', { message: (err as Error)?.message });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    });
}
