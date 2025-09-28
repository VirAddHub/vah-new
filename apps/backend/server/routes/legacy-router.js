// server/routes/legacy-router.js - Temporary router for missing endpoints
const express = require('express');
const { body, param, validationResult } = require('express-validator');

// Integration configuration helper
const isConfigured = (name) => {
    if (name === 'gocardless') {
        return !!(process.env.GOCARDLESS_ACCESS_TOKEN && process.env.GOCARDLESS_WEBHOOK_SECRET);
    }
    if (name === 'sumsub') {
        return !!(process.env.SUMSUB_API_KEY && process.env.SUMSUB_WEBHOOK_SECRET);
    }
    return false;
};

function notImplemented(res, provider) {
    return res.status(501).json({
        ok: false,
        error: `${provider} integration is not configured`,
        configured: false,
    });
}

function buildLegacyRouter(deps = {}) {
    const router = express.Router();
    const { db, logger, auth, adminOnly } = deps;

    // Helper middleware for error handling
    const asyncHandler = (fn) => (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

    // Helper for validation errors
    const validate = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    };

    // Use real auth middleware from server
    const authMiddleware = auth || ((req, res, next) => {
        // Basic auth check - replace with real auth middleware
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // TODO: Verify JWT token and set req.user
        req.user = { id: 1, email: 'user@example.com', is_admin: false };
        next();
    });

    const adminMiddleware = adminOnly || ((req, res, next) => {
        if (!req.user?.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });

    // ===== PROFILE ROUTES =====

    router.post('/profile/reset-password-request', asyncHandler(async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email required' });

            // Mock response for now
            res.json({
                success: true,
                message: 'If an account exists, a reset link has been sent.'
            });
        } catch (e) {
            logger?.error('reset-password-request failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/profile/reset-password', asyncHandler(async (req, res) => {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                return res.status(400).json({ error: 'Token and password required' });
            }

            res.json({ success: true, message: 'Password reset successfully' });
        } catch (e) {
            logger?.error('reset-password failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/profile/update-password', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new password required' });
            }

            res.json({ success: true, message: 'Password updated successfully' });
        } catch (e) {
            logger?.error('update-password failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/profile/certificate-url', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                certificate_url: 'https://certificates.virtualaddresshub.co.uk/cert.pdf',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        } catch (e) {
            logger?.error('certificate-url failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/profile/certificate.pdf', authMiddleware, asyncHandler(async (req, res) => {
        try {
            // Mock PDF response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="certificate.pdf"');
            res.send('Mock PDF content');
        } catch (e) {
            logger?.error('certificate.pdf failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/profile/request-business-name-change', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { businessName } = req.body;
            if (!businessName) {
                return res.status(400).json({ error: 'Business name required' });
            }

            res.json({
                success: true,
                message: 'Business name change request submitted'
            });
        } catch (e) {
            logger?.error('business-name-change failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== MAIL ITEMS ROUTES =====

    router.delete('/mail-items/:id', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Mail item deleted' });
        } catch (e) {
            logger?.error('delete mail-item failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/mail-items/:id/history', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({
                history: [
                    { action: 'received', timestamp: new Date().toISOString(), user: 'system' },
                    { action: 'scanned', timestamp: new Date().toISOString(), user: 'admin' }
                ]
            });
        } catch (e) {
            logger?.error('mail-item history failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/mail-items/:id/tag', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { tag } = req.body;
            res.json({ success: true, message: 'Tag added', tag });
        } catch (e) {
            logger?.error('add tag failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/mail-items/:id/restore', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Mail item restored' });
        } catch (e) {
            logger?.error('restore mail-item failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== MAIL ROUTES =====

    router.get('/mail', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                mail_items: [],
                total: 0,
                page: 1,
                per_page: 20
            });
        } catch (e) {
            logger?.error('get mail failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/mail/forward', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { mailItemIds, forwardingAddress } = req.body;
            if (!mailItemIds || !forwardingAddress) {
                return res.status(400).json({ error: 'Mail item IDs and forwarding address required' });
            }

            res.json({
                success: true,
                message: 'Forwarding request created',
                request_id: Date.now()
            });
        } catch (e) {
            logger?.error('mail forward failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/mail/history/:id', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({
                history: [
                    { action: 'forwarded', timestamp: new Date().toISOString(), address: '123 Main St' }
                ]
            });
        } catch (e) {
            logger?.error('mail history failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/mail/bulk-forward-request', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { mailItemIds, forwardingAddress } = req.body;
            res.json({
                success: true,
                message: 'Bulk forwarding request created',
                request_id: Date.now()
            });
        } catch (e) {
            logger?.error('bulk forward failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== ADMIN ROUTES =====

    router.get('/admin/invoices', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                invoices: [],
                total: 0,
                page: 1,
                per_page: 20
            });
        } catch (e) {
            logger?.error('admin invoices failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/admin/invoices/:id', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({
                invoice: {
                    id,
                    amount: 100,
                    status: 'paid',
                    created_at: new Date().toISOString()
                }
            });
        } catch (e) {
            logger?.error('admin invoice detail failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/invoices/:id/link', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({
                invoice_link: `https://app.virtualaddresshub.co.uk/invoices/${id}?token=abc123`,
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            });
        } catch (e) {
            logger?.error('admin invoice link failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/invoices/:id/resend', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Invoice resent successfully' });
        } catch (e) {
            logger?.error('admin invoice resend failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/admin/support', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20
            });
        } catch (e) {
            logger?.error('admin support failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.patch('/admin/support/:id', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { status, response } = req.body;
            res.json({ success: true, message: 'Support ticket updated' });
        } catch (e) {
            logger?.error('admin support update failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/support/tickets/:id/close', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Support ticket closed' });
        } catch (e) {
            logger?.error('admin support close failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/admin/users/:user_id', authMiddleware, adminMiddleware, param('user_id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const userId = parseInt(req.params.user_id);
            res.json({
                user: {
                    id: userId,
                    email: 'user@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    status: 'active'
                }
            });
        } catch (e) {
            logger?.error('admin user detail failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/admin/users/:user_id/billing-history', authMiddleware, adminMiddleware, param('user_id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const userId = parseInt(req.params.user_id);
            res.json({
                billing_history: [],
                total: 0
            });
        } catch (e) {
            logger?.error('admin user billing failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.put('/admin/users/:user_id', authMiddleware, adminMiddleware, param('user_id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const userId = parseInt(req.params.user_id);
            const updates = req.body;
            res.json({ success: true, message: 'User updated', user_id: userId });
        } catch (e) {
            logger?.error('admin user update failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.put('/admin/users/:user_id/kyc-status', authMiddleware, adminMiddleware, param('user_id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const userId = parseInt(req.params.user_id);
            const { kyc_status } = req.body;
            res.json({ success: true, message: 'KYC status updated', kyc_status });
        } catch (e) {
            logger?.error('admin user kyc update failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/users/:user_id/impersonate', authMiddleware, adminMiddleware, param('user_id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const userId = parseInt(req.params.user_id);
            res.json({
                success: true,
                message: 'Impersonation started',
                impersonated_user_id: userId
            });
        } catch (e) {
            logger?.error('admin impersonate failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/mail-items/:id/log-physical-receipt', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Physical receipt logged' });
        } catch (e) {
            logger?.error('log physical receipt failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/mail-items/:id/log-physical-dispatch', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { tracking_number } = req.body;
            res.json({ success: true, message: 'Physical dispatch logged', tracking_number });
        } catch (e) {
            logger?.error('log physical dispatch failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/mail-items/:id/restore', authMiddleware, adminMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Mail item restored by admin' });
        } catch (e) {
            logger?.error('admin restore mail-item failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/payments/create-adhoc-link', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
        try {
            const { user_id, amount, description } = req.body;
            if (!user_id || !amount) {
                return res.status(400).json({ error: 'User ID and amount required' });
            }

            res.json({
                success: true,
                payment_link_url: 'https://pay.gocardless.com/one-off/test123',
                payment_id: 'test123'
            });
        } catch (e) {
            logger?.error('create adhoc payment failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/admin/payments/initiate-refund', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
        try {
            const { payment_id, amount, reason } = req.body;
            if (!payment_id) {
                return res.status(400).json({ error: 'Payment ID required' });
            }

            res.json({ success: true, message: 'Refund initiated successfully' });
        } catch (e) {
            logger?.error('initiate refund failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== PAYMENT ROUTES =====

    router.get('/payments', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                payments: [],
                total: 0,
                page: 1,
                per_page: 20
            });
        } catch (e) {
            logger?.error('get payments failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/payments/subscriptions/status', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                subscription_status: 'active',
                next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        } catch (e) {
            logger?.error('subscription status failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/payments/redirect-flows', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { amount, description } = req.body;
            res.json({
                success: true,
                redirect_flow_id: 'test123',
                redirect_url: 'https://pay.gocardless.com/flow/test123'
            });
        } catch (e) {
            logger?.error('create redirect flow failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/payments/redirect-flows/:id/complete', authMiddleware, param('id').isAlphanumeric(), validate, asyncHandler(async (req, res) => {
        try {
            const id = req.params.id;
            res.json({ success: true, message: 'Payment completed', payment_id: id });
        } catch (e) {
            logger?.error('complete redirect flow failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/payments/subscriptions', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { plan_id } = req.body;
            res.json({
                success: true,
                subscription_id: 'sub_test123',
                status: 'active'
            });
        } catch (e) {
            logger?.error('create subscription failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== KYC ROUTES =====

    router.get('/kyc/status', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                kyc_status: 'verified',
                verification_date: new Date().toISOString()
            });
        } catch (e) {
            logger?.error('kyc status failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/kyc/start', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                success: true,
                verification_url: 'https://verify.sumsub.com/test123',
                session_id: 'test123'
            });
        } catch (e) {
            logger?.error('kyc start failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/kyc/resend-verification-link', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({ success: true, message: 'Verification link resent' });
        } catch (e) {
            logger?.error('kyc resend failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/kyc/upload', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({ success: true, message: 'Document uploaded successfully' });
        } catch (e) {
            logger?.error('kyc upload failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== FORWARDING ROUTES =====

    router.get('/forwarding-requests/usage', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                usage: {
                    current_month: 5,
                    limit: 20,
                    remaining: 15
                }
            });
        } catch (e) {
            logger?.error('forwarding usage failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.put('/forwarding-requests/:id/cancel', authMiddleware, param('id').isInt(), validate, asyncHandler(async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            res.json({ success: true, message: 'Forwarding request cancelled' });
        } catch (e) {
            logger?.error('cancel forwarding failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== SUPPORT ROUTES =====

    router.get('/support', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20
            });
        } catch (e) {
            logger?.error('get support failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/support', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { subject, message, priority } = req.body;
            if (!subject || !message) {
                return res.status(400).json({ error: 'Subject and message required' });
            }

            res.json({
                success: true,
                ticket_id: Date.now(),
                message: 'Support ticket created'
            });
        } catch (e) {
            logger?.error('create support failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== INVOICE ROUTES =====

    router.get('/invoices/:token', param('token').isAlphanumeric(), validate, asyncHandler(async (req, res) => {
        try {
            const token = req.params.token;
            res.json({
                invoice: {
                    id: 1,
                    amount: 100,
                    status: 'paid',
                    token,
                    created_at: new Date().toISOString()
                }
            });
        } catch (e) {
            logger?.error('get invoice failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== WEBHOOK ROUTES =====

    router.post('/webhooks-gc', asyncHandler(async (req, res) => {
        try {
            if (!isConfigured('gocardless')) return notImplemented(res, 'GoCardless');
            // TODO: verify signature and process events
            res.status(204).end();
        } catch (e) {
            logger?.error('webhook gc failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/webhooks-postmark', asyncHandler(async (req, res) => {
        try {
            res.json({ success: true, message: 'Webhook received' });
        } catch (e) {
            logger?.error('webhook postmark failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/webhooks/sumsub', asyncHandler(async (req, res) => {
        try {
            if (!isConfigured('sumsub')) return notImplemented(res, 'Sumsub');
            // TODO: verify signature and process events
            res.status(204).end();
        } catch (e) {
            logger?.error('webhook sumsub failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== GO CARDLESS ROUTES =====

    router.post('/gc/redirect-flow/start', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { amount, description } = req.body;
            res.json({
                success: true,
                redirect_flow_id: 'gc_test123',
                redirect_url: 'https://pay.gocardless.com/flow/gc_test123'
            });
        } catch (e) {
            logger?.error('gc redirect flow start failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/gc/redirect-flow/callback', asyncHandler(async (req, res) => {
        try {
            const { redirect_flow_id } = req.query;
            res.json({
                success: true,
                message: 'Payment flow completed',
                redirect_flow_id
            });
        } catch (e) {
            logger?.error('gc redirect flow callback failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== COMPANY SEARCH =====

    router.post('/company-search', authMiddleware, asyncHandler(async (req, res) => {
        try {
            const { query } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Search query required' });
            }

            res.json({
                companies: [
                    { name: 'Example Company Ltd', number: '12345678', address: '123 Main St' }
                ],
                total: 1
            });
        } catch (e) {
            logger?.error('company search failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== DEBUG ROUTES =====

    router.get('/debug/whoami', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                user: req.user,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            logger?.error('debug whoami failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/debug/db-info', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({
                db_type: 'mock',
                connection_status: 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            logger?.error('debug db-info failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    // ===== UTILITY ROUTES =====

    router.get('/csrf', asyncHandler(async (req, res) => {
        try {
            res.json({
                csrf_token: 'mock_csrf_token_' + Date.now()
            });
        } catch (e) {
            logger?.error('csrf failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/health', asyncHandler(async (req, res) => {
        try {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        } catch (e) {
            logger?.error('health check failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/auth/logout-all', authMiddleware, asyncHandler(async (req, res) => {
        try {
            res.json({ success: true, message: 'Logged out from all devices' });
        } catch (e) {
            logger?.error('logout-all failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/auth/hash-check', asyncHandler(async (req, res) => {
        try {
            const { password, hash } = req.body;
            res.json({
                matches: password === 'test123', // Mock check
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            logger?.error('hash-check failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.get('/auth/db-check', asyncHandler(async (req, res) => {
        try {
            res.json({
                db_status: 'connected',
                db_type: 'mock',
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            logger?.error('auth db-check failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    router.post('/create-admin-user', asyncHandler(async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            res.json({
                success: true,
                message: 'Admin user created',
                user_id: Date.now()
            });
        } catch (e) {
            logger?.error('create-admin-user failed', e);
            res.status(500).json({ error: 'Server error' });
        }
    }));

    return router;
}

module.exports = { buildLegacyRouter };
