// apps/backend/src/server/routes/debug-email.ts
import { Router } from 'express';
import {
    sendPasswordResetEmail,
    sendPasswordChangedConfirmation,
    sendWelcomeEmail,
    sendPlanCancelled,
    sendInvoiceSent,
    sendPaymentFailed,
    sendKycSubmitted,
    sendKycApproved,
    sendKycRejected,
    sendSupportRequestReceived,
    sendSupportRequestClosed,
    sendMailScanned,
    sendMailForwarded,
    sendMailReceivedAfterCancellation
} from '../../lib/mailer';
import { ENV } from '../../env';

// Type definitions for email functions

const router = Router();

// Debug route to test email functions with current environment
// Guarded by DEBUG_EMAIL_ENABLED env var and IP allowlist
router.post('/debug-email', async (req, res) => {
    // Check if debug emails are enabled
    if (process.env.DEBUG_EMAIL_ENABLED !== '1') {
        return res.status(404).json({ error: 'Debug endpoint disabled' });
    }

    // Optional: Add IP allowlist check
    const allowedIPs = process.env.DEBUG_EMAIL_ALLOWED_IPS?.split(',') || [];
    const clientIP = req.ip || req.connection.remoteAddress || '';
    if (allowedIPs.length > 0 && clientIP && !allowedIPs.includes(clientIP)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { type, email, name } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                usage: {
                    type: 'password-reset|password-changed|welcome|plan-cancelled|invoice-sent|payment-failed|kyc-submitted|kyc-approved|kyc-rejected|support-received|support-closed|mail-scanned|mail-forwarded|mail-after-cancellation',
                    email: 'test@example.com',
                    name: 'Test User (optional)',
                    cta_url: 'https://example.com (for password-reset, welcome, payment-failed)',
                    ticket_id: 'TICKET-123 (for support types)',
                    reason: 'Rejection reason (for kyc-rejected)',
                    invoice_number: 'INV-123 (for invoice-sent)',
                    amount: '£29.99 (for invoice-sent)',
                    end_date: '2024-12-31 (for plan-cancelled)',
                    tracking_number: 'TRK123456 (for mail-forwarded)',
                    carrier: 'Royal Mail (for mail-forwarded)',
                    subject: 'Email subject (for mail types)'
                }
            });
        }

        let result;

        switch (type) {
            // Auth / Security
            case 'password-reset':
                await sendPasswordResetEmail({
                    email,
                    name: name || 'Test User',
                    cta_url: req.body.cta_url || `${ENV.APP_BASE_URL}/reset?token=test123`
                });
                result = {
                    type: 'password-reset-email',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/reset?token=test123`,
                    status: 'sent'
                };
                break;

            case 'password-changed':
                await sendPasswordChangedConfirmation({
                    email,
                    name: name || 'Test User'
                });
                result = {
                    type: 'password-changed-confirmation',
                    status: 'sent'
                };
                break;

            // Welcome & onboarding
            case 'welcome':
                await sendWelcomeEmail({
                    email,
                    name: name || 'Test User',
                    cta_url: req.body.cta_url || `${ENV.APP_BASE_URL}/dashboard`
                });
                result = {
                    type: 'welcome-email',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/dashboard`,
                    status: 'sent'
                };
                break;

            // Billing & invoices
            case 'plan-cancelled':
                await sendPlanCancelled({
                    email,
                    name: name || 'Test User',
                    end_date: req.body.end_date,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'plan-cancelled',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/billing`,
                    status: 'sent'
                };
                break;

            case 'invoice-sent':
                await sendInvoiceSent({
                    email,
                    name: name || 'Test User',
                    invoice_number: req.body.invoice_number,
                    amount: req.body.amount,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'invoice-sent',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/billing`,
                    status: 'sent'
                };
                break;

            case 'payment-failed':
                await sendPaymentFailed({
                    email,
                    name: name || 'Test User',
                    cta_url: req.body.cta_url || `${ENV.APP_BASE_URL}/billing#payment`
                });
                result = {
                    type: 'payment-failed',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/billing#payment`,
                    status: 'sent'
                };
                break;

            // KYC
            case 'kyc-submitted':
                await sendKycSubmitted({
                    email,
                    name: name || 'Test User',
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'kyc-submitted',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/profile`,
                    status: 'sent'
                };
                break;

            case 'kyc-approved':
                await sendKycApproved({
                    email,
                    name: name || 'Test User',
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'kyc-approved',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/profile`,
                    status: 'sent'
                };
                break;

            case 'kyc-rejected':
                await sendKycRejected({
                    email,
                    name: name || 'Test User',
                    reason: req.body.reason,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'kyc-rejected',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/profile`,
                    status: 'sent'
                };
                break;

            // Support
            case 'support-received':
                await sendSupportRequestReceived({
                    email,
                    name: name || 'Test User',
                    ticket_id: req.body.ticket_id,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'support-request-received',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/support`,
                    status: 'sent'
                };
                break;

            case 'support-closed':
                await sendSupportRequestClosed({
                    email,
                    name: name || 'Test User',
                    ticket_id: req.body.ticket_id,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'support-request-closed',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/support`,
                    status: 'sent'
                };
                break;

            // Mail events
            case 'mail-scanned':
                await sendMailScanned({
                    email,
                    name: name || 'Test User',
                    subject: req.body.subject,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'mail-scanned',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/mail`,
                    status: 'sent'
                };
                break;

            case 'mail-forwarded':
                await sendMailForwarded({
                    email,
                    name: name || 'Test User',
                    forwarding_address: req.body.forwarding_address || "123 Test Street, London, SW1A 1AA, United Kingdom",
                    forwarded_date: req.body.forwarded_date || new Date().toLocaleDateString('en-GB')
                });
                result = {
                    type: 'mail-forwarded',
                    forwarding_address: req.body.forwarding_address || "123 Test Street, London, SW1A 1AA, United Kingdom",
                    forwarded_date: req.body.forwarded_date || new Date().toLocaleDateString('en-GB'),
                    status: 'sent'
                };
                break;

            case 'mail-after-cancellation':
                await sendMailReceivedAfterCancellation({
                    email,
                    name: name || 'Test User',
                    subject: req.body.subject,
                    cta_url: req.body.cta_url
                });
                result = {
                    type: 'mail-received-after-cancellation',
                    cta: req.body.cta_url || `${ENV.APP_BASE_URL}/mail`,
                    status: 'sent'
                };
                break;

            default:
                return res.status(400).json({
                    error: 'Invalid type. Use one of the supported types.',
                    availableTypes: [
                        'password-reset', 'password-changed', 'welcome',
                        'plan-cancelled', 'invoice-sent', 'payment-failed',
                        'kyc-submitted', 'kyc-approved', 'kyc-rejected',
                        'support-received', 'support-closed',
                        'mail-scanned', 'mail-forwarded', 'mail-after-cancellation'
                    ]
                });
        }

        res.json({
            success: true,
            message: `Test ${type} email sent successfully`,
            environment: {
                APP_BASE_URL: ENV.APP_BASE_URL,
                EMAIL_FROM: ENV.EMAIL_FROM,
                EMAIL_FROM_NAME: ENV.EMAIL_FROM_NAME,
                POSTMARK_STREAM: ENV.POSTMARK_STREAM
            },
            result
        });

    } catch (error) {
        console.error('[debug-email] Error:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
