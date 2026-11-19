import type { Request, Response } from 'express';
import fs from 'fs';
import { getPool } from '../db';
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

/**
 * Open Stripe's customer portal: update card, view payment history, cancel at period end.
 * /update-bank and /reauthorise are kept as aliases of /portal for existing screens.
 */
export async function postBillingPortal(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const customerResult = await getOrCreateStripeCustomerForUser(userId);
    if (!customerResult.ok) {
      return res.status(customerResult.error === 'user_not_found' ? 404 : 503).json({ ok: false, error: customerResult.error });
    }
    const url = await createStripeBillingPortalLink(customerResult.customerId);
    return res.json({ ok: true, data: { redirect_url: url, url } });
  } catch (error) {
    logger.error('[postBillingPortal] error', { message: (error as any)?.message ?? String(error) });
    return res.status(503).json({ ok: false, error: 'billing_portal_unavailable' });
  }
}
export const postUpdateBank = postBillingPortal;
export const postReauthorise = postBillingPortal;

export async function postRetryPayment(_req: Request, res: Response) {
  // Not implemented. Stripe retries failed renewals itself; the customer fixes their card in the
  // billing portal. This used to answer "queued" without doing anything.
  res.status(501).json({ ok: false, error: 'not_implemented', message: 'Update your payment method in the billing portal; Stripe retries the payment automatically.' });
}

/**
 * Changing plan is not available yet. The previous implementation changed the plan in our database
 * only: Stripe went on charging the old price while the customer was told the change had succeeded
 * (and its transaction ran across pooled connections). It needs a Stripe subscription update, which
 * is recorded as outstanding provider work in audit/DECISIONS.md.
 */
export async function postChangePlan(_req: Request, res: Response) {
  return res.status(501).json({
    ok: false,
    error: 'not_implemented',
    message: 'Changing plan is not available yet. Please contact support.',
  });
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Cancelling happens in the Stripe billing portal (POST /api/billing/portal); Stripe then sends
  // customer.subscription.updated and the webhook records cancel_at_period_end. Never report a
  // cancellation that did not happen.
  return res.status(501).json({
    ok: false,
    error: 'use_billing_portal',
    message: 'Cancel your plan from the billing portal.',
  });
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

