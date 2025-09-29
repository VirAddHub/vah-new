// apps/backend/src/server/routes/webhooks-postmark.ts
import type { Request, Response } from 'express';

// Postmark webhook secret validation
const WEBHOOK_SECRET = process.env.POSTMARK_WEBHOOK_SECRET || '';

function webhookSecretOk(secretHeader?: string) {
    if (!WEBHOOK_SECRET) return true; // no secret => allow (CI/Staging)
    return secretHeader === WEBHOOK_SECRET;
}

export function postmarkWebhook(req: Request, res: Response) {
    const secretHeader = req.headers['x-postmark-webhook-secret'] as string;
    if (!webhookSecretOk(secretHeader)) {
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
