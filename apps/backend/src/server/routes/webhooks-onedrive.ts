import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';

const router = Router();

// Optional auth envs
const EXPECTED_SHARED_SECRET = process.env.ONEDRIVE_WEBHOOK_SECRET || '';
const BASIC_USER = process.env.ONEDRIVE_WEBHOOK_BASIC_USER || '';
const BASIC_PASS = process.env.ONEDRIVE_WEBHOOK_BASIC_PASS || '';

function parseBasic(auth?: string) {
  if (!auth || !auth.startsWith('Basic ')) return null;
  try {
    const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
    return { user, pass };
  } catch { return null; }
}

// ---- Per-route raw capture ----
// This runs BEFORE your handler and grabs the raw Buffer even if global express.json() exists.
// If req.body was already parsed (object), we reconstruct a raw buffer from it.
router.use(express.raw({ type: 'application/json' }), (req: any, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    try {
      req.parsedBody = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      req.parsedBody = undefined;
    }
  } else {
    // Body was already parsed by global express.json()
    req.parsedBody = req.body && typeof req.body === 'object' ? req.body : undefined;
    try {
      req.rawBody = Buffer.from(JSON.stringify(req.parsedBody ?? {}), 'utf8');
    } catch {
      req.rawBody = undefined;
    }
  }
  next();
});

router.post('/', (req: any, res) => {
  const ct = String(req.get('content-type') || '');
  const reqId = req.get('x-request-id');

  // ---- Optional Basic auth ----
  if (BASIC_USER && BASIC_PASS) {
    const creds = parseBasic(req.get('authorization'));
    if (!creds || creds.user !== BASIC_USER || creds.pass !== BASIC_PASS) {
      return res.status(401).json({ ok: false, error: 'unauthorised' });
    }
  }

  // ---- Optional HMAC signature ----
  const hasSecret = Boolean(EXPECTED_SHARED_SECRET);
  const headerSig = req.get('x-signature');
  if (hasSecret) {
    if (!headerSig || !req.rawBody) {
      return res.status(400).json({ ok: false, error: 'missing_signature_or_raw_body' });
    }
    const h = crypto.createHmac('sha256', EXPECTED_SHARED_SECRET).update(req.rawBody).digest('hex');
    if (h !== headerSig) {
      return res.status(400).json({ ok: false, error: 'invalid_signature' });
    }
  }

  // ---- Content-Type & JSON checks ----
  if (!ct.includes('application/json')) {
    return res.status(400).json({ ok: false, error: 'invalid_content_type', ct });
  }

  const body = req.parsedBody;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  // ✅ Accept ANY object (so {"event":"test"} passes). Add strict validation later.
  return res.status(200).json({
    ok: true,
    received: body,
    meta: {
      request_id: reqId,
      content_type: ct,
      content_length: req.get('content-length') || (req.rawBody ? String(req.rawBody.length) : undefined),
      raw_present: Boolean(req.rawBody),
      signature_required: hasSecret,
      signature_header_present: Boolean(headerSig),
      basic_auth_enabled: Boolean(BASIC_USER && BASIC_PASS),
    },
  });
});

export default router;
