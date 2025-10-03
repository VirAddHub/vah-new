// src/server/routes/billing.ts
// Billing and invoices API endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { pricingService } from '../services/pricing';
import { selectPaged } from '../db-helpers';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/billing
 * Get billing overview for current user
 */
router.get('/billing', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user with plan info
        const userResult = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.plan_id,
                u.plan_status,
                u.gocardless_customer_id,
                u.gocardless_mandate_id,
                p.name as plan_name,
                p.price_pence,
                COALESCE(p.billing_cycle, p.billing_interval, 'monthly') as billing_cycle
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // Get next invoice/payment info
        const nextInvoiceResult = await pool.query(`
            SELECT period_end, amount_pence
            FROM invoices
            WHERE user_id = $1 AND status = 'paid'
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        const lastInvoice = nextInvoiceResult.rows[0];

        // Calculate next billing date (30 days after last invoice period_end)
        let nextBillingDate: string | null = null;
        if (lastInvoice && lastInvoice.period_end) {
            const periodEnd = new Date(lastInvoice.period_end);
            nextBillingDate = new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return res.json({
            ok: true,
            data: {
                current_plan: user.plan_name || null,
                plan_status: user.plan_status || 'inactive',
                next_billing_date: nextBillingDate,
                amount_due: user.price_pence || 0,
                billing_cycle: user.billing_cycle || 'monthly',
                has_payment_method: !!user.gocardless_mandate_id,
                subscription: {
                    plan_id: user.plan_id,
                    plan_name: user.plan_name,
                    status: user.plan_status,
                    price_pence: user.price_pence
                }
            }
        });
    } catch (error: any) {
        console.error('[GET /api/billing] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/billing/invoices
 * Get all invoices for current user (with pagination support)
 * Query params: ?page=1&pageSize=20
 */
router.get('/billing/invoices', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    try {
        const result = await selectPaged(
            `SELECT
                id,
                user_id,
                amount_pence as amount,
                'GBP' as currency,
                status,
                period_start as due_date,
                period_end as paid_at,
                invoice_number,
                created_at,
                NULL as token
            FROM invoices
            WHERE user_id = $1
            ORDER BY created_at DESC`,
            [userId],
            page,
            pageSize
        );

        return res.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[GET /api/billing/invoices] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/billing/invoices/:id/link
 * Get download link for invoice
 */
router.get('/billing/invoices/:id/link', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const invoiceId = parseInt(req.params.id);
    const pool = getPool();

    if (!invoiceId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT id, token, user_id
            FROM invoices
            WHERE id = $1 AND user_id = $2
        `, [invoiceId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const invoice = result.rows[0];

        // Generate download URL using token
        const baseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
        const downloadUrl = `${baseUrl}/api/invoices/download/${invoice.token}`;

        return res.json({ ok: true, url: downloadUrl });
    } catch (error: any) {
        console.error('[GET /api/billing/invoices/:id/link] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
