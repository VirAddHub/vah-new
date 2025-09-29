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

    try {
        const buf = req.body;                 // Buffer
        const text = buf.toString('utf8');    // String
        const evt = JSON.parse(text);         // Parsed JSON

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

        // Postmark expects 204 with no body
        res.setHeader('x-build', (process.env.RENDER_GIT_COMMIT || 'local') + ':' + (process.env.NODE_ENV || 'dev'));
        return res.sendStatus(204);           // No body
    } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
});

export default r;
