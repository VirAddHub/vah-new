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

        // Honeypot check - if website field is filled, it's spam
        if (body.website && body.website.trim() !== '') {
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
        if (!emailRegex.test(body.email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!MOCK_EMAIL) {
            // Check if Postmark is configured
            if (!process.env.POSTMARK_SERVER_TOKEN || !process.env.POSTMARK_FROM || !process.env.POSTMARK_TO) {
                console.log('[contact] Postmark not configured, treating as mock');
                console.log('[contact] Would send to support:', {
                    from: process.env.POSTMARK_FROM || 'not-set',
                    to: process.env.POSTMARK_TO || 'not-set',
                    subject: `New contact form: ${body.subject}`,
                    replyTo: body.email
                });
                console.log('[contact] Would send auto-reply to:', body.email);
            } else {
                const client = new Postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

                // Email to support
                await client.sendEmail({
                    From: process.env.POSTMARK_FROM,
                    To: process.env.POSTMARK_TO,
                    ReplyTo: body.email,
                    MessageStream: 'outbound',
                    Subject: `New contact form: ${body.subject}`,
                    TextBody:
                        `Name: ${body.name}
Email: ${body.email}
Company: ${body.company ?? '-'}
Type: ${body.inquiryType ?? 'general'}

Message:
${body.message}`,
                });

                // Optional auto-reply
                await client.sendEmail({
                    From: process.env.POSTMARK_FROM,
                    To: body.email,
                    MessageStream: 'outbound',
                    Subject: 'We received your message',
                    TextBody:
                        `Hi ${body.name || 'there'},

Thanks for contacting VirtualAddressHub. A member of our UK team will reply during business hours.

— VirtualAddressHub Support`,
                });
            }
        } else {
            console.log('[contact] MOCK_EMAIL on — skipping real sends');
            console.log('[contact] Would send to support:', {
                from: process.env.POSTMARK_FROM || 'not-set',
                to: process.env.POSTMARK_TO || 'not-set',
                subject: `New contact form: ${body.subject}`,
                replyTo: body.email
            });
            console.log('[contact] Would send auto-reply to:', body.email);
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('[contact] send failed', err);
        return res.status(500).json({ error: 'Unable to send message' });
    }
});

module.exports = router;
