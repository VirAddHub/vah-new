import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/webhook/migrate — non-production only (router not mounted when NODE_ENV=production).
 *
 * Protection: shared server secret (not CSRF). Callers use Bearer or a dedicated header; browser
 * session cookies are irrelevant. CSRF middleware skips this path only so automated callers are
 * not required to send X-CSRF-Token — auth is entirely the secret verified below.
 */

/** Minimum length for MIGRATE_WEBHOOK_SECRET (server-only; never commit). */
const MIN_SECRET_LENGTH = 32;

/** Single JSON body for any auth failure (avoids distinguishing unconfigured vs wrong secret). */
function respondWebhookUnauthorized(res: Response): void {
    res.status(401).json({ ok: false, error: 'unauthorized' });
}

function getConfiguredSecret(): string | null {
    const raw = process.env.MIGRATE_WEBHOOK_SECRET;
    if (typeof raw !== 'string') return null;
    const s = raw.trim();
    if (s.length < MIN_SECRET_LENGTH) return null;
    return s;
}

/**
 * Accept Bearer token or dedicated header (machine-to-machine; not CSRF-protected).
 */
function extractProvidedSecret(req: Request): string | null {
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const t = auth.slice('Bearer '.length).trim();
        return t.length > 0 ? t : null;
    }
    const h = req.headers['x-migrate-webhook-secret'];
    if (typeof h === 'string' && h.trim().length > 0) {
        return h.trim();
    }
    return null;
}

/** Constant-time comparison on fixed-length digests (no early exit on UTF-8 length mismatch). */
function secretsMatch(expected: string, provided: string): boolean {
    try {
        const a = crypto.createHash('sha256').update(expected, 'utf8').digest();
        const b = crypto.createHash('sha256').update(provided, 'utf8').digest();
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

/**
 * POST /api/webhook/migrate
 *
 * Requires MIGRATE_WEBHOOK_SECRET (≥32 chars) on the server and one of:
 * - Authorization: Bearer <secret>
 * - X-Migrate-Webhook-Secret: <secret>
 *
 * Body: { trigger: "migrate" }
 */
router.post('/webhook/migrate', async (req: Request, res: Response) => {
    const expected = getConfiguredSecret();
    const provided = extractProvidedSecret(req);
    if (!expected || !provided || !secretsMatch(expected, provided)) {
        return respondWebhookUnauthorized(res);
    }

    try {
        const { trigger } = req.body;

        if (trigger !== 'migrate') {
            return res.status(400).json({
                ok: false,
                error: 'Invalid trigger',
            });
        }

        console.log('🚀 Webhook triggered migrations (authenticated)...');

        const { runStartupMigrations } = require('../scripts/startup-migrate');
        await runStartupMigrations();

        res.json({
            ok: true,
            message: 'Migrations completed successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Webhook Migrate] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Failed to run migrations',
            message,
        });
    }
});

export default router;
