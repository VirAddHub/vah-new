// src/server/routes/contact.ts
// Contact form API endpoint

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

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

        // Get Postmark configuration
        const postmarkToken = process.env.POSTMARK_TOKEN || process.env.POSTMARK_SERVER_TOKEN;
        const postmarkFrom = process.env.POSTMARK_FROM || 'support@virtualaddresshub.co.uk';
        const postmarkTo = process.env.POSTMARK_TO || 'support@virtualaddresshub.co.uk';
        const postmarkFromName = process.env.POSTMARK_FROM_NAME || 'VirtualAddressHub Support';

        if (!postmarkToken) {
            console.warn('[POST /api/contact] No Postmark token configured');
            return res.status(500).json({ 
                ok: false, 
                error: 'Email service not configured' 
            });
        }

        // Send email via Postmark
        const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': postmarkToken,
            },
            body: JSON.stringify({
                From: `"${postmarkFromName}" <${postmarkFrom}>`,
                To: postmarkTo,
                ReplyTo: email,
                Subject: `Contact Form: ${subject}`,
                HtmlBody: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Inquiry Type:</strong> ${inquiryType || 'General'}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                    <hr>
                    <p><em>This message was sent via the VirtualAddressHub contact form.</em></p>
                `,
                TextBody: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Inquiry Type: ${inquiryType || 'General'}

Message:
${message}

---
This message was sent via the VirtualAddressHub contact form.
                `,
                // Anti-loop headers
                Headers: [
                    { Name: 'Auto-Submitted', Value: 'auto-replied' },
                    { Name: 'X-Auto-Response-Suppress', Value: 'All' }
                ]
            })
        });

        if (!postmarkResponse.ok) {
            const errorData = await postmarkResponse.json();
            console.error('[POST /api/contact] Postmark error:', errorData);
            return res.status(500).json({ 
                ok: false, 
                error: 'Failed to send email' 
            });
        }

        const result = await postmarkResponse.json();
        console.log('[POST /api/contact] Email sent successfully:', result.MessageID);

        return res.json({ ok: true, data: { messageId: result.MessageID } });

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
