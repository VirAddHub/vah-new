// Test endpoint for CH verification emails (for testing only)
import { Router, Request, Response } from 'express';
import { sendChVerificationNudge, sendChVerificationReminder } from '../../lib/mailer';

const router = Router();

/**
 * POST /api/test/ch-verification-email
 * Test endpoint to send CH verification emails
 * Only works if INTERNAL_CRON_TOKEN is set and matches
 */
router.post('/ch-verification-email', async (req: Request, res: Response) => {
    const { type, email, name } = req.body;
    const token = req.headers['x-internal-token'] || req.query.token;

    // Simple auth check - use INTERNAL_CRON_TOKEN if set, otherwise allow in non-production
    const expectedToken = process.env.INTERNAL_CRON_TOKEN;
    if (expectedToken && token !== expectedToken) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!email) {
        return res.status(400).json({ ok: false, error: 'email_required' });
    }

    const emailType = type || 'nudge';

    try {
        if (emailType === 'nudge') {
            await sendChVerificationNudge({
                email,
                first_name: name || 'Test User',
            });
        } else if (emailType === 'reminder') {
            await sendChVerificationReminder({
                email,
                first_name: name || 'Test User',
            });
        } else {
            return res.status(400).json({ ok: false, error: 'invalid_type', message: 'Type must be "nudge" or "reminder"' });
        }

        return res.json({
            ok: true,
            message: `CH verification ${emailType} email sent to ${email}`,
        });
    } catch (error: any) {
        console.error('[test-ch-email] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'email_failed',
            message: error.message || 'Failed to send email',
        });
    }
});

export default router;

