// server/routes/contact.js
const express = require('express');
const Postmark = require('postmark');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const required = ['name', 'email', 'subject', 'message'];

const FROM = process.env.POSTMARK_FROM; // hello@ or support@
const TO = process.env.POSTMARK_TO || process.env.POSTMARK_FROM; // fallback to same inbox
const FROM_NAME = process.env.POSTMARK_FROM_NAME || 'VirtualAddressHub';

// Rate limiting: 5 requests per 15 minutes
const limit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact form submissions. Please wait 15 minutes and try again.' }
});

router.post('/', limit, async (req, res) => {
  try {
    const body = req.body || {};

    // Basic validation
    for (const k of required) {
      if (!body[k] || typeof body[k] !== 'string') {
        return res.status(400).json({ error: `Missing field: ${k}` });
      }
    }
    // Honeypot
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return res.status(422).json({ error: 'Spam detected' });
    }

    // Env var fallback for Postmark token
    const token = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_TOKEN;
    if (!token) {
      console.warn('[contact] Missing Postmark token (POSTMARK_SERVER_TOKEN or POSTMARK_TOKEN)');
      return res.status(500).json({ error: 'Email service not configured' });
    }
    const client = new Postmark.ServerClient(token);

    // Email to team
    await client.sendEmail({
      From: FROM_NAME ? `${FROM_NAME} <${FROM}>` : FROM,
      To: TO,
      ReplyTo: body.email, // so Reply in Outlook goes to the customer
      MessageStream: 'outbound',
      Subject: `New contact form: ${body.subject}`,
      TextBody:
        `Name: ${body.name}
Email: ${body.email}
Company: ${body.company ?? '-'}
Type: ${body.inquiryType ?? 'general'}

Message:
${body.message}`,
      Headers: [{ Name: 'X-VAH-Source', Value: 'contact-form' }],
    });

    // Optional auto-reply to sender
    await client.sendEmail({
      From: FROM_NAME ? `${FROM_NAME} <${FROM}>` : FROM,
      To: body.email,
      MessageStream: 'outbound',
      Subject: 'We received your message',
      TextBody:
        `Hi ${body.name || 'there'},

Thanks for contacting VirtualAddressHub — we'll reply as soon as possible.

— VirtualAddressHub Support`,
      ReplyTo: TO, // if they reply to the auto-reply, it reaches support inbox
      Headers: [
        { Name: 'Auto-Submitted', Value: 'auto-replied' },
        { Name: 'X-Auto-Response-Suppress', Value: 'All' } // helpful for Outlook/Exchange
      ],
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] send failed', err);
    return res.status(500).json({ error: 'Unable to send message' });
  }
});

module.exports = router;