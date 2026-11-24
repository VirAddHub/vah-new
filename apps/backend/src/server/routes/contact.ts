// src/server/routes/contact.ts
// Contact form API endpoint

import { clientKey } from '../lib/clientKey';
import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import rateLimit from 'express-rate-limit';
import { sendSimpleEmail } from '../../services/mailer';
import { ENV } from '../../env';
import { z } from 'zod';

const router = Router();

// Rate limiting: 5 requests per 15 minutes per IP
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        ok: false,
        error: 'Too many contact form submissions. Please wait 15 minutes and try again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
});

// Runtime validation (security review F32): every field is checked as a bounded string before use.
const INQUIRY_TYPES = ['general', 'pricing', 'technical', 'billing', 'compliance'] as const;
const contactSchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().max(254).email(),
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
    inquiryType: z.enum(INQUIRY_TYPES).optional(),
    website: z.string().max(500).optional(), // honeypot field
});

/** Encode text for an HTML text context; template markup is the only HTML in the email. */
export function encodeHtmlText(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

/**
 * POST /api/contact
 * Submit contact form message
 */
router.post('/', contactLimiter, async (req: Request, res: Response) => {
    try {
        const parsed = contactSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            const field = String(parsed.error.issues[0]?.path?.[0] ?? '');
            return res.status(400).json({
                ok: false,
                error: field === 'email' ? 'Invalid email format' : 'Please fill in your name, email, subject and message (message up to 5000 characters).',
            });
        }
        const { name, email, subject, message, inquiryType, website } = parsed.data;

        // Honeypot spam protection
        if (website && website.trim() !== '') {
            return res.status(400).json({ 
                ok: false, 
                error: 'Spam detected' 
            });
        }

        // Get support email for contact form destination
        // Note: ops@virtualaddresshub.co.uk is NOT used for email - it's only for admin logins
        const supportEmail = process.env.SUPPORT_EMAIL || process.env.POSTMARK_TO || process.env.OPS_ALERT_EMAIL || 'support@virtualaddresshub.co.uk';

        // Build email content
        const emailSubject = `Contact Form: ${subject.replace(/[\r\n]+/g, ' ')}`;
        const htmlBody = `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${encodeHtmlText(name)}</p>
                    <p><strong>Email:</strong> ${encodeHtmlText(email)}</p>
                    <p><strong>Subject:</strong> ${encodeHtmlText(subject)}</p>
                    <p><strong>Inquiry Type:</strong> ${encodeHtmlText(inquiryType || 'general')}</p>
                    <p><strong>Message:</strong></p>
                    <p>${encodeHtmlText(message).replace(/\r?\n/g, '<br>')}</p>
                    <hr>
                    <p><em>This message was sent via the VirtualAddressHub contact form.</em></p>
        `;
        const textBody = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Inquiry Type: ${inquiryType || 'General'}

Message:
${message}

---
This message was sent via the VirtualAddressHub contact form.
        `;

        // Send email via centralized mailer
        // To: support email (support@virtualaddresshub.co.uk)
        // From: verified domain sender (ENV.EMAIL_FROM)
        // Reply-To: user's email (so support can reply directly)
        try {
            await sendSimpleEmail({
                to: supportEmail,
                subject: emailSubject,
                htmlBody: htmlBody.trim(),
                textBody: textBody.trim(),
                from: ENV.EMAIL_FROM,
                replyTo: email, // User's email so support can reply directly
            });

            logger.info('[POST /api/contact] Email sent successfully via centralized mailer');
            return res.json({ ok: true, data: { message: 'Contact form submitted successfully' } });
        } catch (emailError: any) {
            logger.error('[POST /api/contact] Failed to send email:', emailError);
            return res.status(500).json({ 
                ok: false, 
                error: 'Failed to send email' 
            });
        }

    } catch (error: any) {
        logger.error('[POST /api/contact] error:', error);
        return res.status(500).json({ 
            ok: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

export default router;
