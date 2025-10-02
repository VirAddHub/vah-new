// src/server/routes/payments.ts
// Payment and subscription management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { pricingService } from '../services/pricing';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/payments/subscriptions/status
 * Get subscription status for current user
 */
router.get('/subscriptions/status', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                u.plan_status,
                u.gocardless_customer_id,
                u.gocardless_mandate_id,
                p.name as plan_name,
                p.billing_cycle,
                p.price_pence
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Get last payment date
        const lastPaymentResult = await pool.query(`
            SELECT period_end
            FROM invoices
            WHERE user_id = $1 AND status = 'paid'
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        const lastPayment = lastPaymentResult.rows[0];
        let nextPaymentDate: string | null = null;

        if (lastPayment && lastPayment.period_end) {
            const periodEnd = new Date(lastPayment.period_end);
            nextPaymentDate = new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return res.json({
            ok: true,
            data: {
                plan_status: user.plan_status || 'inactive',
                plan_name: user.plan_name || null,
                billing_cycle: user.billing_cycle || 'monthly',
                next_payment_date: nextPaymentDate,
                price_pence: user.price_pence || 0,
                has_payment_method: !!user.gocardless_mandate_id
            }
        });
    } catch (error: any) {
        console.error('[GET /api/payments/subscriptions/status] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/subscriptions
 * Manage subscription (cancel, reactivate)
 */
router.post('/subscriptions', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { action } = req.body;
    const pool = getPool();

    if (!action || !['cancel', 'reactivate'].includes(action)) {
        return res.status(400).json({ ok: false, error: 'invalid_action' });
    }

    try {
        const newStatus = action === 'cancel' ? 'cancelled' : 'active';

        await pool.query(`
            UPDATE "user"
            SET plan_status = $1, updated_at = $2
            WHERE id = $3
        `, [newStatus, Date.now(), userId]);

        // TODO: Also cancel/reactivate the mandate in GoCardless API

        return res.json({ ok: true, status: newStatus });
    } catch (error: any) {
        console.error('[POST /api/payments/subscriptions] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/redirect-flows
 * Create GoCardless redirect flow for payment setup
 */
router.post('/redirect-flows', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user info
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // TODO: Call GoCardless API to create redirect flow
        // For now, return a mock response

        const mockRedirectFlowId = `RF${Date.now()}`;
        const mockRedirectUrl = process.env.GOCARDLESS_REDIRECT_URL ||
            `https://pay-sandbox.gocardless.com/flow/${mockRedirectFlowId}`;

        // Store redirect flow ID for later completion
        await pool.query(`
            UPDATE "user"
            SET gocardless_redirect_flow_id = $1, updated_at = $2
            WHERE id = $3
        `, [mockRedirectFlowId, Date.now(), userId]);

        // In production, you would do:
        // const gocardlessClient = require('gocardless-nodejs');
        // const client = gocardlessClient(process.env.GOCARDLESS_ACCESS_TOKEN);
        // const redirectFlow = await client.redirectFlows.create({
        //     description: "VirtualAddressHub Subscription",
        //     session_token: userId.toString(),
        //     success_redirect_url: `${process.env.APP_BASE_URL}/payment/success`,
        //     prefilled_customer: {
        //         email: user.email,
        //         given_name: user.first_name,
        //         family_name: user.last_name
        //     }
        // });

        return res.json({
            ok: true,
            data: {
                redirect_flow_id: mockRedirectFlowId,
                redirect_url: mockRedirectUrl
            },
            redirect_url: mockRedirectUrl
        });
    } catch (error: any) {
        console.error('[POST /api/payments/redirect-flows] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/redirect-flows/:flowId/complete
 * Complete GoCardless redirect flow after user returns
 */
router.post('/redirect-flows/:flowId/complete', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const flowId = req.params.flowId;
    const pool = getPool();

    try {
        // TODO: Complete the redirect flow with GoCardless API
        // const gocardlessClient = require('gocardless-nodejs');
        // const client = gocardlessClient(process.env.GOCARDLESS_ACCESS_TOKEN);
        // const completedFlow = await client.redirectFlows.complete(flowId, {
        //     session_token: userId.toString()
        // });

        // Mock completion for now
        const mockCustomerId = `CU${Date.now()}`;
        const mockMandateId = `MD${Date.now()}`;

        // Update user with GoCardless IDs
        await pool.query(`
            UPDATE "user"
            SET
                gocardless_customer_id = $1,
                gocardless_mandate_id = $2,
                plan_status = 'active',
                updated_at = $3
            WHERE id = $4
        `, [mockCustomerId, mockMandateId, Date.now(), userId]);

        return res.json({
            ok: true,
            customer_id: mockCustomerId,
            mandate_id: mockMandateId,
            status: 'active'
        });
    } catch (error: any) {
        console.error('[POST /api/payments/redirect-flows/:flowId/complete] error:', error);
        return res.status(500).json({ ok: false, error: 'completion_error', message: error.message });
    }
});

export default router;
