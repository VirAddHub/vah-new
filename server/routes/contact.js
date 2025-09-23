const express = require('express');
const Postmark = require('postmark');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const required = ['name', 'email', 'subject', 'message'];
const MOCK_EMAIL = process.env.MOCK_EMAIL === '1';

// Rate limiting: 5 requests per 15 minutes per IP
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Too many contact form submissions, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/', contactLimiter, async (req, res) => {
    try {
        const body = req.body || {};
        const { name, email, subject, message, website, company, inquiryType } = body;

        // Honeypot check - if website field is filled, it's spam
        if (website && website.trim() !== '') {
            return res.status(400).json({ error: 'Spam detected' });
        }

        // Validate required fields
        for (const k of required) {
            if (!body[k] || typeof body[k] !== 'string') {
                return res.status(400).json({ error: `Missing field: ${k}` });
            }
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Decide mock vs real at request-time
        const useMock =
            String(process.env.MOCK_EMAIL || '') === '1' ||
            !process.env.POSTMARK_SERVER_TOKEN ||
            !process.env.POSTMARK_FROM ||
            !process.env.POSTMARK_TO;

        if (useMock) {
            console.log('[contact] MOCK_EMAIL active. Would send:', {
                toTeam: {
                    to: process.env.POSTMARK_TO || 'not-set',
                    from: process.env.POSTMARK_FROM || 'not-set',
                    subject: `New contact form: ${subject}`,
                    replyTo: email,
                },
                toSender: {
                    to: email,
                    from: process.env.POSTMARK_FROM || 'not-set',
                    subject: 'We received your message',
                },
                payload: { name, email, subject, message, company, inquiryType }
            });
            return res.json({ ok: true, mode: 'mock' });
        }

        // Send real emails
        const client = new Postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

        // Email to support
        await client.sendEmail({
            From: process.env.POSTMARK_FROM,
            To: process.env.POSTMARK_TO,
            ReplyTo: email,
            MessageStream: 'outbound',
            Subject: `New contact form: ${subject}`,
            TextBody:
                `Name: ${name}
Email: ${email}
Company: ${company ?? '-'}
Type: ${inquiryType ?? 'general'}

Message:
${message}`,
        });

        // Optional auto-reply
        await client.sendEmail({
            From: process.env.POSTMARK_FROM,
            To: email,
            MessageStream: 'outbound',
            Subject: 'We received your message',
            TextBody:
                `Hi ${name || 'there'},

Thanks for contacting VirtualAddressHub. A member of our UK team will reply during business hours.

— VirtualAddressHub Support`,
        });

        return res.json({ ok: true });
    } catch (err) {
        console.error('[contact] send failed', err);
        return res.status(500).json({ error: 'Unable to send message' });
    }
});

module.exports = router;
