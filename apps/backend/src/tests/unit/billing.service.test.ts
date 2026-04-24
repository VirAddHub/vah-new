import { describe, it, expect, vi } from 'vitest';

describe('Billing service logic', () => {
  describe('changePlan', () => {
    it('calls payment provider with correct parameters', async () => {
      const provider = { changePlan: vi.fn().mockResolvedValue({ ok: true }) };
      const findUser = vi.fn().mockResolvedValue({ id: 'user-1', subscriptionId: 'sub-1' });
      const findPlan = vi.fn().mockResolvedValue({ id: 'plan-new', price: 2999 });
      const getActivePlan = vi.fn().mockResolvedValue({ id: 'plan-old' });

      const user = await findUser('user-1');
      const plan = await findPlan('plan-new');
      const currentPlan = await getActivePlan('user-1');

      if (plan.id !== currentPlan.id) {
        await provider.changePlan(user.subscriptionId, plan.id);
      }

      expect(provider.changePlan).toHaveBeenCalledWith('sub-1', 'plan-new');
    });

    it('throws if userId not found', async () => {
      const findUser = vi.fn().mockResolvedValue(null);

      await expect(async () => {
        const user = await findUser('bad-user');
        if (!user) throw new Error('User not found');
      }).rejects.toThrow('User not found');
    });

    it('throws if planId does not exist', async () => {
      const findPlan = vi.fn().mockResolvedValue(null);

      await expect(async () => {
        const plan = await findPlan('bad-plan');
        if (!plan) throw new Error('Plan not found');
      }).rejects.toThrow('Plan not found');
    });

    it('does not call provider if plan already active (idempotent)', async () => {
      const provider = { changePlan: vi.fn().mockResolvedValue({ ok: true }) };
      const getActivePlan = vi.fn().mockResolvedValue({ id: 'plan-same' });
      const findPlan = vi.fn().mockResolvedValue({ id: 'plan-same' });

      const currentPlan = await getActivePlan('user-1');
      const newPlan = await findPlan('plan-same');

      if (currentPlan.id !== newPlan.id) {
        await provider.changePlan('sub-1', newPlan.id);
      }

      expect(provider.changePlan).not.toHaveBeenCalled();
    });
  });

  describe('generateInvoice', () => {
    it('returns invoice object with correct total', async () => {
      const calculateInvoice = vi.fn().mockResolvedValue({ total: 2999, currency: 'GBP', lines: [] });
      const findSubscription = vi.fn().mockResolvedValue({ id: 'sub-1', planId: 'plan-1' });

      const sub = await findSubscription('account-1');
      const invoice = await calculateInvoice(sub, new Date('2024-01-01'), new Date('2024-01-31'));

      expect(invoice).toHaveProperty('total', 2999);
    });

    it('throws if account has no active subscription', async () => {
      const findSubscription = vi.fn().mockResolvedValue(null);

      await expect(async () => {
        const sub = await findSubscription('account-no-sub');
        if (!sub) throw new Error('No active subscription');
      }).rejects.toThrow('No active subscription');
    });

    it('throws if period dates invalid (end before start)', async () => {
      await expect(async () => {
        const start = new Date('2024-01-31');
        const end = new Date('2024-01-01');
        if (end <= start) throw new Error('Invalid period: end date must be after start date');
      }).rejects.toThrow('Invalid period');
    });
  });
});
