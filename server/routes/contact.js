// server/routes/contact.js
// Paste this file and mount it BEFORE any CSRF middleware:
//   app.use('/api/contact', require('./routes/contact'));
//
// ENV required in production:
//   POSTMARK_TOKEN=pm_xxx            // or POSTMARK_SERVER_TOKEN
//   POSTMARK_FROM=support@virtualaddresshub.co.uk  // verified sender
//   POSTMARK_TO=support@virtualaddresshub.co.uk    // where you receive messages
// Optional:
//   MOCK_EMAIL=1   // force mock mode (no real sends)

const express = require('express');
const Postmark = require('postmark');

const router = express.Router();

// --- config / env ---
const POSTMARK_TOKEN =
  process.env.POSTMARK_TOKEN || process.env.POSTMARK_SERVER_TOKEN || '';
const POSTMARK_FROM = process.env.POSTMARK_FROM || '';
const POSTMARK_TO = process.env.POSTMARK_TO || '';
const MOCK_EMAIL = process.env.MOCK_EMAIL === '1';

// --- tiny in-memory rate limiter (5 req / 15min per IP) ---
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const hits = new Map();
/** @param {import('express').Request} req */
function keyForReq(req) {
  // if you use proxies, ensure app.set('trust proxy', 1) elsewhere
  return req.ip || req.headers['x-forwarded-for'] || 'local';
}
function rateLimit(req, res, next) {
  const k = keyForReq(req);
  const now = Date.now();
  const rec = hits.get(k) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  rec.count += 1;
  hits.set(k, rec);

  res.setHeader('RateLimit-Policy', `${RATE_LIMIT_MAX};w=${RATE_LIMIT_WINDOW_MS / 1000}`);
  res.setHeader('RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - rec.count));
  res.setHeader('RateLimit-Reset', Math.ceil((rec.resetAt - now) / 1000));

  if (rec.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

// --- helpers ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sanitize = (s = '', max = 200) =>
  String(s).replace(/[\r\n<>]/g, '').slice(0, max).trim();
const missingConfig = () => ({
  POSTMARK_TOKEN: !POSTMARK_TOKEN,
  POSTMARK_FROM: !POSTMARK_FROM,
  POSTMARK_TO: !POSTMARK_TO,
});

// --- route ---
/**
 * POST /api/contact
 * Body: { name, email, company?, subject, message, inquiryType?, website? }
 * - `website` is a honeypot (must be empty).
 */
router.post('/', rateLimit, express.json(), async (req, res) => {
  try {
    const { name, email, company, subject, message, inquiryType, website } = req.body || {};

    // honeypot
    if (website && String(website).trim() !== '') {
      return res.status(400).json({ error: 'Spam detected' });
    }

    // basic validation
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Missing field: name' });
    if (!email || !EMAIL_RE.test(String(email))) return res.status(400).json({ error: 'Missing/invalid email' });
    if (!subject || !String(subject).trim()) return res.status(400).json({ error: 'Missing field: subject' });
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'Missing field: message' });

    const displayName = sanitize(name, 60) || 'Contact';
    const cleanSubject = sanitize(subject, 150) || 'Contact';
    const cleanCompany = sanitize(company || '-', 120);
    const kind = sanitize(inquiryType || 'general', 40);

    // mock mode if explicitly set, or if config missing
    const cfgMissing = missingConfig();
    const isMisconfigured = Object.values(cfgMissing).some(Boolean);
    const mockMode = MOCK_EMAIL || isMisconfigured;

    if (mockMode) {
      console.log('[contact:mock] would send:', {
        from: POSTMARK_FROM || '(unset)',
        to: POSTMARK_TO || '(unset)',
        replyTo: email,
        subject: `New contact: ${cleanSubject}`,
        name: displayName,
        company: cleanCompany,
        inquiryType: kind,
        message,
      });
      if (isMisconfigured && !MOCK_EMAIL) {
        // tell the client what's missing (useful during setup)
        return res.status(500).json({ error: 'Email service misconfigured', missing: cfgMissing });
      }
      return res.json({ ok: true, mode: 'mock' });
    }

    // real send via Postmark
    const client = new Postmark.ServerClient(POSTMARK_TOKEN);

    // 1) to support inbox (use verified sender in From, user's email in Reply-To)
    await client.sendEmail({
      From: `${displayName} via VirtualAddressHub <${POSTMARK_FROM}>`,
      To: POSTMARK_TO,
      ReplyTo: email, // <-- customer's address here
      MessageStream: 'outbound',
      Tag: 'contact-form',
      Subject: `New contact: ${cleanSubject}`,
      TextBody: [
        `Name: ${displayName}`,
        `Email: ${email}`,
        `Company: ${cleanCompany}`,
        `Type: ${kind}`,
        ``,
        `Message:`,
        `${message}`,
      ].join('\n'),
    });

    // 2) optional auto-reply back to customer
    try {
      await client.sendEmail({
        From: POSTMARK_FROM,
        To: email,
        MessageStream: 'outbound',
        Tag: 'contact-autoreply',
        Subject: 'We received your message',
        TextBody: `Hi ${displayName},

Thanks for contacting VirtualAddressHub. A member of our UK team will reply during business hours.

— VirtualAddressHub Support`,
      });
    } catch (e) {
      // don't fail the whole request if auto-reply errors
      console.warn('[contact] auto-reply failed:', e?.message || e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] error:', err?.message || err);
    return res.status(500).json({ error: 'Unable to send message' });
  }
});

module.exports = router;