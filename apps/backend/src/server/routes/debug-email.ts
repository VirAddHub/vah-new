// apps/backend/src/server/routes/debug-email.ts
import { Router } from 'express';
import { sendBillingReminder, sendKycReminder, sendMailReceived } from '../../lib/mailer';
import { ENV } from '../../env';

// Type definitions for email functions
type SendBillingReminderArgs = { email: string; name?: string };
type SendKycReminderArgs = { email: string; name?: string };
type SendMailReceivedArgs = { email: string; name?: string; preview?: string };

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
                    type: 'billing|kyc|mail',
                    email: 'test@example.com',
                    name: 'Test User (optional)',
                    preview: 'Message preview (for mail type)'
                }
            });
        }

    let result;

    switch (type) {
      case 'billing':
        await sendBillingReminder({
          email,
          name: name || 'Test User'
        });
        result = {
          type: 'billing-reminder',
          cta: `${ENV.APP_BASE_URL}/billing#payment`,
          status: 'sent'
        };
        break;
        
      case 'kyc':
        await sendKycReminder({
          email,
          name: name || 'Test User'
        });
        result = {
          type: 'kyc-reminder',
          cta: `${ENV.APP_BASE_URL}/profile`,
          status: 'sent'
        };
        break;
        
      case 'mail':
        await sendMailReceived({
          email,
          name: name || 'Test User',
          preview: req.body.preview || 'This is a test message preview...'
        });
        result = {
          type: 'mail-received',
          cta: `${ENV.APP_BASE_URL}/mail`,
          status: 'sent'
        };
        break;

            default:
                return res.status(400).json({
                    error: 'Invalid type. Use: billing, kyc, or mail',
                    availableTypes: ['billing', 'kyc', 'mail']
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
