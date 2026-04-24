import type { Request, Response } from 'express';
import fs from 'fs';
import { getPool } from '../db';
import { gcCreateReauthoriseLink, gcCreateUpdateBankLink } from '../../lib/gocardless';
import { TimestampUtils } from '../../lib/timestamp-utils';
import { logger } from '../../lib/logger';
import { getBillingProvider } from '../../config/billing';
import { getStripe } from '../../lib/stripe';
import {
  completeStripeSetupIntentForUser,
  createStripeBillingPortalLink,
  getOrCreateStripeCustomerForUser,
} from '../services/billingStripe';
import { prepareInvoicePdfForDownload } from '../services/billingInvoicePdf';
import { getBillingOverviewData } from '../services/billingOverview';
import {
  getInvoiceDetailsForUser,
  listInvoicesForUser,
} from '../services/billingInvoicesQuery';

/**
 * GET /api/billing/invoices/:id
 * Get invoice details with line items breakdown
 */
export async function getInvoiceById(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const invoiceId = Number(req.params.id);

  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  try {
    const data = await getInvoiceDetailsForUser(userId, invoiceId);
    if (!data) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    return res.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    logger.error('[getInvoiceById] error', { message: error?.message ?? String(error) });
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

export async function getBillingOverview(req: Request, res: Response) {
  const userId = Number(req.user!.id);

  try {
    const data = await getBillingOverviewData(userId);
    res.json({ ok: true, data });
  } catch (error) {
    logger.error('[getBillingOverview] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to fetch billing overview' });
  }
}

export async function listInvoices(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.page_size ?? 12);
  const data = await listInvoicesForUser(userId, page, pageSize);
  res.json({ ok: true, data });
}

export async function downloadInvoicePdf(req: Request, res: Response) {
  const callerId = BigInt(req.user!.id);
  const isAdmin = req.user!.is_admin || false;
  const invoiceId = Number(req.params.id);

  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  try {
    const result = await prepareInvoicePdfForDownload({
      invoiceId,
      callerId,
      isAdmin,
    });
    if (!result.ok) {
      if (result.error === 'not_found') {
        return res.status(404).json({ ok: false, error: result.error });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ ok: false, error: result.error });
      }
      return res.status(500).json({ ok: false, error: result.error });
    }

    const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${result.filename}"`);
    fs.createReadStream(result.fullPath).pipe(res);
  } catch (error: any) {
    logger.error('[downloadInvoicePdf] error', { message: error?.message ?? String(error) });
    return res.status(500).json({ ok: false, error: 'download_failed' });
  }
}

export async function postUpdateBank(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    if (getBillingProvider() === 'stripe') {
      const customerResult = await getOrCreateStripeCustomerForUser(userId);
      if (!customerResult.ok) {
        if (customerResult.error === 'user_not_found') {
          return res.status(404).json({ ok: false, error: customerResult.error });
        }
        return res.status(503).json({ ok: false, error: customerResult.error });
      }
      const url = await createStripeBillingPortalLink(customerResult.customerId);
      return res.json({ ok: true, data: { redirect_url: url, url } });
    }
    const link = await gcCreateUpdateBankLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    logger.error('[postUpdateBank] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to create update bank link' });
  }
}

export async function postReauthorise(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    if (getBillingProvider() === 'stripe') {
      const customerResult = await getOrCreateStripeCustomerForUser(userId);
      if (!customerResult.ok) {
        if (customerResult.error === 'user_not_found') {
          return res.status(404).json({ ok: false, error: customerResult.error });
        }
        return res.status(503).json({ ok: false, error: customerResult.error });
      }
      const url = await createStripeBillingPortalLink(customerResult.customerId);
      return res.json({ ok: true, data: { redirect_url: url, url } });
    }
    const link = await gcCreateReauthoriseLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    logger.error('[postReauthorise] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to create reauthorization link' });
  }
}

export async function postRetryPayment(req: Request, res: Response) {
  // Stub: schedule a retry on latest failed payment (implement via GC API)
  res.json({ ok: true, data: { queued: true } });
}

export async function postChangePlan(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const { plan_id } = req.body ?? {};
    const pool = getPool();

    if (!plan_id || isNaN(Number(plan_id))) {
      return res.status(400).json({ ok: false, error: 'Invalid plan_id' });
    }

    // Verify the plan exists and is active
    const planCheck = await pool.query(
      'SELECT id, name, interval, price_pence FROM plans WHERE id = $1 AND active = true',
      [plan_id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Plan not found or inactive' });
    }

    const plan = planCheck.rows[0];

    // Start transaction to ensure consistency
    await pool.query('BEGIN');

    try {
      // Update user's plan
      await pool.query(
        'UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3',
        [plan_id, TimestampUtils.forTableField('user', 'updated_at'), userId]
      );

      // UPSERT subscription record (exactly one per user)
      const cadence = plan.interval === 'year' ? 'annual' : 'monthly';
      await pool.query(
        `INSERT INTO subscription (user_id, plan_name, cadence, status, updated_at)
         VALUES ($1, $2, $3, 'pending', NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           plan_name = EXCLUDED.plan_name,
           cadence = EXCLUDED.cadence,
           updated_at = NOW()`,
        [userId, plan.name, cadence]
      );

      // Log the plan change for audit purposes
      await pool.query(
        `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'plan_change', 'user', $2, $3, $4)`,
        [userId, userId, JSON.stringify({
          old_plan_id: null, // Could be enhanced to track previous plan
          new_plan_id: plan_id,
          plan_name: plan.name,
          plan_interval: plan.interval,
          price_pence: plan.price_pence
        }), TimestampUtils.forTableField('admin_audit', 'created_at')]
      );

      await pool.query('COMMIT');

      logger.info('[postChangePlan] plan_changed', {
        userId,
        planName: plan.name,
        interval: plan.interval,
      });

      res.json({
        ok: true,
        data: {
          plan_id: Number(plan_id),
          plan_name: plan.name,
          interval: plan.interval,
          price_pence: plan.price_pence,
          message: 'Plan updated successfully. Billing will be updated on the next cycle.'
        }
      });
    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    logger.error('[postChangePlan] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to change plan' });
  }
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Stub: mark cancel_at_period_end in GC and persist
  res.json({ ok: true, data: { cancels_on: null } });
}

/**
 * POST /api/billing/payment-methods/setup-intent
 * Create a Stripe SetupIntent for updating the customer's default payment method.
 * Used by the in-app billing modal (card payments only).
 */
export async function postCreateStripeSetupIntent(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);

    if (getBillingProvider() !== 'stripe') {
      return res
        .status(400)
        .json({ ok: false, error: 'billing_provider_not_stripe' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res
        .status(503)
        .json({ ok: false, error: 'stripe_not_configured' });
    }

    const customerResult = await getOrCreateStripeCustomerForUser(userId);
    if (!customerResult.ok) {
      if (customerResult.error === 'user_not_found') {
        return res
          .status(404)
          .json({ ok: false, error: customerResult.error });
      }
      return res
        .status(503)
        .json({ ok: false, error: customerResult.error });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerResult.customerId,
      // Use automatic payment methods but we'll restrict to card in the client Payment Element.
      automatic_payment_methods: { enabled: true },
      usage: 'off_session',
    });

    if (!setupIntent.client_secret) {
      logger.error('[postCreateStripeSetupIntent] missing_client_secret', {
        userId,
        setupIntentId: setupIntent.id,
      });
      return res
        .status(500)
        .json({ ok: false, error: 'missing_client_secret' });
    }

    return res.json({
      ok: true,
      data: {
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
      },
    });
  } catch (error: any) {
    logger.error('[postCreateStripeSetupIntent] error', {
      message: error?.message ?? String(error),
    });
    return res
      .status(500)
      .json({ ok: false, error: 'setup_intent_failed' });
  }
}

/**
 * POST /api/billing/payment-methods/complete-setup
 * Mark the payment method from a succeeded SetupIntent as the customer's default.
 * This endpoint trusts Stripe as source of truth and re-fetches the SetupIntent server-side.
 */
export async function postCompleteStripeSetupIntent(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const { setup_intent_id } = (req.body ?? {}) as {
      setup_intent_id?: string;
    };

    if (!setup_intent_id || typeof setup_intent_id !== 'string') {
      return res
        .status(400)
        .json({ ok: false, error: 'invalid_setup_intent_id' });
    }

    if (getBillingProvider() !== 'stripe') {
      return res
        .status(400)
        .json({ ok: false, error: 'billing_provider_not_stripe' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res
        .status(503)
        .json({ ok: false, error: 'stripe_not_configured' });
    }

    const result = await completeStripeSetupIntentForUser({
      userId,
      setupIntentId: setup_intent_id,
    });
    if (!result.ok) {
      if (result.error === 'customer_mismatch') {
        logger.warn('[postCompleteStripeSetupIntent] customer_mismatch', {
          userId,
          customerId: result.customerId,
          siCustomer: result.siCustomer,
          setupIntentId: setup_intent_id,
        });
        return res.status(400).json({ ok: false, error: result.error });
      }
      if (result.error === 'setup_intent_not_succeeded') {
        return res.status(400).json({
          ok: false,
          error: result.error,
          status: result.status,
        });
      }
      return res.status(400).json({ ok: false, error: result.error });
    }

    logger.info('[postCompleteStripeSetupIntent] default_payment_method_updated', {
      userId,
    });

    return res.json({
      ok: true,
      data: {
        default_payment_method: result.defaultPaymentMethod,
      },
    });
  } catch (error: any) {
    logger.error('[postCompleteStripeSetupIntent] error', {
      message: error?.message ?? String(error),
    });
    return res
      .status(500)
      .json({ ok: false, error: 'complete_setup_failed' });
  }
}

