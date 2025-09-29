// apps/backend/src/server/routes/webhooks-postmark.ts
import { Router } from 'express';

const r = Router();

// simple optional basic auth for Postmark
const USER = process.env.POSTMARK_WEBHOOK_USER;
const PASS = process.env.POSTMARK_WEBHOOK_PASS;
function basicAuthOk(authHeader?: string) {
  if (!USER || !PASS) return true; // auth disabled
  if (!authHeader?.startsWith('Basic ')) return false;
  const creds = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [u, p] = creds.split(':', 2);
  return u === USER && p === PASS;
}

r.post('/', (req, res) => {
  if (!basicAuthOk(req.headers.authorization)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const evt = req.body ?? {};
  const type = evt.RecordType || evt.recordType || 'Unknown';
  const id = evt.MessageID || evt.RecordID || 'n/a';

  // minimal routing; expand as you need
  switch (type) {
    case 'Delivery':
    case 'Open':
    case 'Click':
    case 'Bounce':
    case 'SpamComplaint':
    case 'SubscriptionChange':
      console.log('[postmark-webhook]', type, id);
      break;
    default:
      console.log('[postmark-webhook] Unhandled', type, id);
  }

  // Postmark expects 200/204 with no body
  return res.status(204).end();
});

export default r;
