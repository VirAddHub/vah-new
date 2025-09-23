const express = require('express');
const Postmark = require('postmark');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const required = ['name', 'email', 'subject', 'message'];

// Environment variables with fallback for future-proofing
const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || process.env.POSTMARK_SERVER_TOKEN;
const POSTMARK_FROM = process.env.POSTMARK_FROM;
const POSTMARK_TO = process.env.POSTMARK_TO;
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

        // Short-circuit for mock mode
        if (MOCK_EMAIL) {
            console.log('[contact] MOCK_EMAIL active. Would send:', {
                toTeam: {
                    to: POSTMARK_TO || 'not-set',
                    from: POSTMARK_FROM || 'not-set',
                    subject: `New contact form: ${subject}`,
                    replyTo: email,
                },
                toSender: {
                    to: email,
                    from: POSTMARK_FROM || 'not-set',
                    subject: 'We received your message',
                },
                payload: { name, email, subject, message, company, inquiryType }
            });
            return res.json({ ok: true, mode: 'mock' });
        }

        // Check for missing configuration in non-mock mode
        if (!POSTMARK_TOKEN || !POSTMARK_FROM || !POSTMARK_TO) {
            return res.status(500).json({
                error: 'Email service misconfigured',
                missing: {
                    POSTMARK_TOKEN: !POSTMARK_TOKEN,
                    POSTMARK_FROM: !POSTMARK_FROM,
                    POSTMARK_TO: !POSTMARK_TO,
                },
            });
        }

        // Send real emails
        const client = new Postmark.ServerClient(POSTMARK_TOKEN);

        // Email to support (from your verified Postmark address, with ReplyTo set to the person)
        await client.sendEmail({
            From: POSTMARK_FROM,  // ✅ From your verified Postmark address
            To: POSTMARK_TO,
            ReplyTo: email,  // ✅ ReplyTo the person who submitted the form
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

        // Auto-reply to the person (from your support address)
        await client.sendEmail({
            From: POSTMARK_FROM,  // ✅ From your support address
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
