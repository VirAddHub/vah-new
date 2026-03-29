// apps/backend/src/server/routes/webhooks-postmark.ts
import crypto from 'crypto';
import type { Request, Response } from 'express';

/**
 * Inbound Postmark webhook shared secret (configure in Postmark → Webhooks → custom header).
 * Production: must be set and sent on every request or we reject with 401 (fail-closed).
 * Startup: `productionEnvValidation` also fatals if missing/short in NODE_ENV=production.
 */
const WEBHOOK_SECRET = (process.env.POSTMARK_WEBHOOK_SECRET || '').trim();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function readPostmarkWebhookSecretHeader(req: Request): string | undefined {
    const h = req.headers['x-postmark-webhook-secret'];
    if (typeof h === 'string' && h.length > 0) return h;
    if (Array.isArray(h) && h.length > 0 && typeof h[0] === 'string' && h[0].length > 0) {
        return h[0];
    }
    return undefined;
}

/** Constant-time compare when lengths match; never true if either side is empty. */
function postmarkWebhookSecretsMatch(expected: string, provided: string | undefined): boolean {
    if (!expected || !provided) return false;
    try {
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(provided, 'utf8');
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

function webhookSecretOk(secretHeader: string | undefined): boolean {
    if (IS_PRODUCTION) {
        // Fail closed: no env secret → reject everything (also blocked at process startup).
        if (!WEBHOOK_SECRET) return false;
        return postmarkWebhookSecretsMatch(WEBHOOK_SECRET, secretHeader);
    }
    // Non-production only: allow unauthenticated webhooks when secret is not configured.
    if (!WEBHOOK_SECRET) return true;
    return postmarkWebhookSecretsMatch(WEBHOOK_SECRET, secretHeader);
}

export function postmarkWebhook(req: Request, res: Response) {
    const secretHeader = readPostmarkWebhookSecretHeader(req);
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
