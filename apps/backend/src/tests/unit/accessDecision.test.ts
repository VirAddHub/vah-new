import { describe, it, expect } from 'vitest';
import { paymentOf, verificationOf, decide } from '../../server/services/access';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const sub = (o: Record<string, unknown>) => ({ stripe_subscription_id: 'sub_1', cancel_at_period_end: false, ...o });

describe('paid entitlement', () => {
    it('active is entitled', () => {
        expect(paymentOf(sub({ status: 'active', paid_through_ms: NOW + 10 * DAY }), NOW).entitled).toBe(true);
    });
    it('past due keeps service only until the paid period ends', () => {
        expect(paymentOf(sub({ status: 'past_due', paid_through_ms: NOW + DAY }), NOW).entitled).toBe(true);
        expect(paymentOf(sub({ status: 'past_due', paid_through_ms: NOW - 1 }), NOW).entitled).toBe(false);
    });
    it('cancel at period end keeps service until that date, then ends it even without the final Stripe event', () => {
        expect(paymentOf(sub({ status: 'active', cancel_at_period_end: true, paid_through_ms: NOW + DAY }), NOW).entitled).toBe(true);
        expect(paymentOf(sub({ status: 'active', cancel_at_period_end: true, paid_through_ms: NOW - 1 }), NOW).entitled).toBe(false);
    });
    it('cancelled and missing subscriptions are never entitled', () => {
        expect(paymentOf(sub({ status: 'cancelled', paid_through_ms: NOW + DAY }), NOW).entitled).toBe(false);
        expect(paymentOf(undefined, NOW).entitled).toBe(false);
        expect(paymentOf({ status: 'active', stripe_subscription_id: null }, NOW).entitled).toBe(false);
    });
});

describe('full service needs both payment and approved verification', () => {
    const paid = paymentOf(sub({ status: 'active', paid_through_ms: NOW + DAY }), NOW);
    const overdue = paymentOf(sub({ status: 'past_due', paid_through_ms: NOW - DAY }), NOW);
    it('paid and verified → full', () => {
        expect(decide('good', paid, verificationOf('approved', 0)).level).toBe('full');
    });
    it('paid but verification pending → restricted, next step verification', () => {
        const d = decide('good', paid, verificationOf('pending', 0, true));
        expect(d.level).toBe('onboarding'); expect(d.next).toBe('verification');
    });
    it('verified but overdue → restricted, next step billing', () => {
        const d = decide('good', overdue, verificationOf('approved', 0));
        expect(d.level).toBe('onboarding'); expect(d.next).toBe('billing'); expect(d.missing).toContain('payment_overdue');
    });
    it('verified with an owner still to verify → restricted', () => {
        expect(decide('good', paid, verificationOf('approved', 1)).level).toBe('onboarding');
    });
});
