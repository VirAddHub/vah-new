import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  downloadInvoicePdf, getBillingOverview, getInvoiceById, listInvoices, postUpdateBank, postReauthorise,
  postRetryPayment, postChangePlan, postCancelAtPeriodEnd
} from '../controllers/billing';

const router = Router();
// Routes are mounted at /api/billing in server.ts, so use relative paths here
router.get('/overview', requireAuth, getBillingOverview);
router.get('/invoices', requireAuth, listInvoices);
router.get('/invoices/:id', requireAuth, getInvoiceById);
router.get('/invoices/:id/download', requireAuth, downloadInvoicePdf);
router.post('/update-bank', requireAuth, postUpdateBank);
router.post('/reauthorise', requireAuth, postReauthorise);
router.post('/retry-payment', requireAuth, postRetryPayment);
router.post('/change-plan', requireAuth, postChangePlan);
router.post('/cancel', requireAuth, postCancelAtPeriodEnd);
export default router;