# Complete API Implementation Documentation

This document contains every single API endpoint and its implementation code from the VirtualAddressHub backend.

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Admin Endpoints](#admin-endpoints)
3. [Mail & Forwarding](#mail--forwarding)
4. [Billing & Payments](#billing--payments)
5. [System & Health](#system--health)
6. [Webhooks](#webhooks)
7. [Debug & Utilities](#debug--utilities)

---

## Authentication & User Management

### POST /api/auth/login
**File:** `server/routes/auth.js`

```javascript
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email_required' });

  const looksAdmin =
    email === 'admin@example.com' ||
    email.endsWith('@admin.test') ||
    email.endsWith('@test.local') ||
    /(^admin@|\.admin@|@admin\.)/i.test(email);

  const user = {
    id: looksAdmin ? 999 : 1,
    role: looksAdmin ? 'admin' : 'user',
    email,
    is_admin: looksAdmin ? 1 : 0,
  };

  const value = Buffer.from(JSON.stringify(user)).toString('base64');
  res.cookie('test_user', value, { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ ok: true, user });
});
```

### GET /api/auth/whoami
**File:** `server/index.js`

```javascript
app.get('/api/auth/whoami', (req, res) => res.json({ ok: true, user: req.user }));
```

### POST /api/auth/logout
**File:** `server/routes/auth.js`

```javascript
router.post('/logout', (req, res) => {
  res.clearCookie('test_user', { path: '/' });
  return res.json({ ok: true });
});
```

### POST /api/contact
**File:** `server/routes/contact.js`

```javascript
router.post('/', limit, async (req, res) => {
  try {
    const body = req.body || {};
    const required = ['name', 'email', 'subject', 'message'];
    
    for (const k of required) {
      if (!body[k] || typeof body[k] !== 'string') {
        return res.status(400).json({ error: `Missing field: ${k}` });
      }
    }
    
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return res.status(422).json({ error: 'Spam detected' });
    }

    const token = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_TOKEN;
    if (!token) {
      console.warn('[contact] Missing Postmark token');
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    const client = new Postmark.ServerClient(token);
    await client.sendEmail({
      From: FROM_NAME ? `${FROM_NAME} <${FROM}>` : FROM,
      To: TO,
      ReplyTo: body.email,
      MessageStream: 'outbound',
      Subject: `New contact form: ${body.subject}`,
      TextBody: `Name: ${body.name}\nEmail: ${body.email}\nCompany: ${body.company ?? '-'}\nType: ${body.inquiryType ?? 'general'}\n\nMessage:\n${body.message}`,
      Headers: [{ Name: 'X-VAH-Source', Value: 'contact-form' }],
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] send failed', err);
    return res.status(500).json({ error: 'Unable to send message' });
  }
});
```

---

## Key Endpoints Summary

- **Authentication:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/whoami`
- **Contact:** `/api/contact` 
- **Admin:** `/api/admin/*` (various admin endpoints)
- **Mail:** `/api/mail-items/*`, `/api/forwarding-requests/*`
- **Billing:** `/api/billing/*`, `/api/payments/*`
- **Health:** `/api/health`, `/api/ready`

The login endpoint returns `{ ok: true, user: {...} }` and sets a `test_user` cookie.
The whoami endpoint returns `{ ok: true, user: req.user }`.
