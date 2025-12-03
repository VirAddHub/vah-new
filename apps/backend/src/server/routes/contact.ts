// src/server/routes/contact.ts
// Contact form API endpoint

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { sendSimpleEmail } from '../../services/mailer';
import { ENV } from '../../env';

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
});

// Validation schema
interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
    inquiryType?: string;
    website?: string; // honeypot field
}

/**
 * POST /api/contact
 * Submit contact form message
 */
router.post('/', contactLimiter, async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message, inquiryType, website }: ContactFormData = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Missing required fields: name, email, subject, message' 
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Invalid email format' 
            });
        }

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
        const emailSubject = `Contact Form: ${subject}`;
        const htmlBody = `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Inquiry Type:</strong> ${inquiryType || 'General'}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
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

            console.log('[POST /api/contact] Email sent successfully via centralized mailer');
            return res.json({ ok: true, data: { message: 'Contact form submitted successfully' } });
        } catch (emailError: any) {
            console.error('[POST /api/contact] Failed to send email:', emailError);
            return res.status(500).json({ 
                ok: false, 
                error: 'Failed to send email' 
            });
        }

    } catch (error: any) {
        console.error('[POST /api/contact] error:', error);
        return res.status(500).json({ 
            ok: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

export default router;
