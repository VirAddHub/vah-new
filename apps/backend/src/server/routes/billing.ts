import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  getBillingOverview, listInvoices, postUpdateBank, postReauthorise,
  postRetryPayment, postChangePlan, postCancelAtPeriodEnd
} from '../controllers/billing';

const router = Router();
router.get('/api/billing/overview', requireAuth, getBillingOverview);
router.get('/api/billing/invoices', requireAuth, listInvoices);
router.post('/api/billing/update-bank', requireAuth, postUpdateBank);
router.post('/api/billing/reauthorise', requireAuth, postReauthorise);
router.post('/api/billing/retry-payment', requireAuth, postRetryPayment);
router.post('/api/billing/change-plan', requireAuth, postChangePlan);
router.post('/api/billing/cancel', requireAuth, postCancelAtPeriodEnd);
export default router;