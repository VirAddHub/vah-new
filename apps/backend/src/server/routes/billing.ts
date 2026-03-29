import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import {
  downloadInvoicePdf,
  getBillingOverview,
  getInvoiceById,
  listInvoices,
  postUpdateBank,
  postReauthorise,
  postRetryPayment,
  postChangePlan,
  postCancelAtPeriodEnd,
  postCreateStripeSetupIntent,
  postCompleteStripeSetupIntent,
} from '../controllers/billing';

const router = Router();

/** User-scoped cap on billing UI + mutations (tighter than global /api limiter per account). */
const billingUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as { user?: { id?: number } }).user;
    return u?.id != null ? `billing:user:${u.id}` : ipKeyGenerator(req.ip ?? "");
  },
  handler: (_req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ ok: false, error: "rate_limited" });
  },
});

/** Invoice PDF streaming is heavier than JSON list — separate bucket to limit bulk download abuse. */
const billingInvoiceDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as { user?: { id?: number } }).user;
    return u?.id != null ? `billing:invoice-pdf:${u.id}` : ipKeyGenerator(req.ip ?? "");
  },
  handler: (_req, res) => {
    res.setHeader("Retry-After", "3600");
    return res.status(429).json({ ok: false, error: "rate_limited" });
  },
});

router.use(billingUserLimiter);

// Routes are mounted at /api/billing in server.ts, so use relative paths here
router.get('/overview', requireAuth, getBillingOverview);
router.get('/invoices', requireAuth, listInvoices);
router.get('/invoices/:id', requireAuth, getInvoiceById);
router.get('/invoices/:id/download', requireAuth, billingInvoiceDownloadLimiter, downloadInvoicePdf);
router.post('/update-bank', requireAuth, postUpdateBank);
router.post('/reauthorise', requireAuth, postReauthorise);
router.post(
  '/payment-methods/setup-intent',
  requireAuth,
  postCreateStripeSetupIntent
);
router.post(
  '/payment-methods/complete-setup',
  requireAuth,
  postCompleteStripeSetupIntent
);
router.post('/retry-payment', requireAuth, postRetryPayment);
router.post('/change-plan', requireAuth, postChangePlan);
router.post('/cancel', requireAuth, postCancelAtPeriodEnd);
export default router;