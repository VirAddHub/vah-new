// apps/backend/src/server/routes/webhooks-postmark.ts
import type { Request, Response } from 'express';

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

export function postmarkWebhook(req: Request, res: Response) {
    if (!basicAuthOk(req.headers.authorization)) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    try {
        const body = Buffer.isBuffer(req.body)
            ? JSON.parse(req.body.toString('utf8'))
            : (req.body ?? {});

        const type = body.RecordType || body.recordType || 'Unknown';
        const id = body.MessageID || body.RecordID || 'n/a';

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
        return res.status(204).end();
    } catch (err) {
        return res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
}
