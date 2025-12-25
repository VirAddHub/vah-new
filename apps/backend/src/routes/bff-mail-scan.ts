import { Router, Request, Response } from 'express';
import { getPool } from '../server/db';
import { requireAuth } from '../middleware/auth';
import { streamPdfFromUrl } from '../controllers/pdfProxy';
import { logger } from '../lib/logger';

const router = Router();

function errorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
    }
    return String(e);
}

function toNumberId(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
}

/**
 * New path (recommended):
 * GET /api/bff/mail/scan-url?mailItemId=123&disposition=inline|attachment
 */
router.get('/mail/scan-url', requireAuth, async (req: Request, res: Response) => {
    try {
        const mailItemId = Number(req.query.mailItemId);
        const disposition = (req.query.disposition as string) === 'attachment' ? 'attachment' : 'inline';
        if (!mailItemId || Number.isNaN(mailItemId)) return res.status(400).send('mailItemId required');

        const user = req.user;
        if (!user?.id) return res.status(401).send('Unauthenticated');

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('[bff:mail/scan-url] request', {
                mailItemId,
                disposition,
                userId: user.id,
                is_admin: Boolean(user.is_admin),
            });
        }

        const pool = getPool();
        const { rows } = await pool.query<{
            id: number; user_id: number; deleted: boolean; scan_file_url: string | null; subject: string | null;
        }>(
            `SELECT id, user_id, deleted, scan_file_url, subject
       FROM mail_item
       WHERE id = $1
       LIMIT 1`,
            [mailItemId]
        );

        if (!rows.length) return res.status(404).send('Mail item not found');
        const item = rows[0];

        // Coerce potential string/bigint DB values to number for safe comparison
        const dbUserId = toNumberId(item.user_id);
        const sessionUserId = toNumberId(user.id);

        const isOwner = dbUserId === sessionUserId;
        const isPrivileged = Boolean(user.is_admin);

        if (!isOwner && !isPrivileged) {
            logger.warn('[bff:mail/scan-url] forbidden', { mailItemId, dbUserId, sessionUserId, isPrivileged });
            return res.status(403).send('Forbidden');
        }
        if (item.deleted) return res.status(410).send('Mail item deleted');
        if (!item.scan_file_url) return res.status(404).send('No scan available');

        const httpsUrl = await resolveToHttpsUrl(item.scan_file_url);
        if (!httpsUrl) return res.status(502).send('Failed to resolve file URL');

        const filename = (item.subject || `document-${item.id}`) + '.pdf';
        return streamPdfFromUrl(res, httpsUrl, filename, disposition);
    } catch (err: unknown) {
        logger.error('[bff:mail/scan-url] error', { message: errorMessage(err) });
        return res.status(500).send('Internal Server Error');
    }
});

/**
 * Legacy path (kept for backwards compatibility):
 * GET /api/legacy/mail-items/:id/download?disposition=inline|attachment
 */
router.get('/legacy/mail-items/:id/download', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const disposition = (req.query.disposition as string) === 'attachment' ? 'attachment' : 'inline';
        if (!id || Number.isNaN(id)) return res.status(400).send('Invalid id');

        const user = req.user;
        if (!user?.id) return res.status(401).send('Unauthenticated');

        const pool = getPool();
        const { rows } = await pool.query<{
            id: number; user_id: number; deleted: boolean; scan_file_url: string | null; subject: string | null;
        }>(
            `SELECT id, user_id, deleted, scan_file_url, subject
       FROM mail_item
       WHERE id = $1
       LIMIT 1`,
            [id]
        );

        if (!rows.length) return res.status(404).send('Mail item not found');
        const item = rows[0];

        const dbUserId = toNumberId(item.user_id);
        const sessionUserId = toNumberId(user.id);
        const isOwner = dbUserId === sessionUserId;
        const isPrivileged = Boolean(user.is_admin);
        if (!isOwner && !isPrivileged) {
            logger.warn('[bff:legacy-download] forbidden', { id, dbUserId, sessionUserId, isPrivileged });
            return res.status(403).send('Forbidden');
        }
        if (item.deleted) return res.status(410).send('Mail item deleted');
        if (!item.scan_file_url) return res.status(404).send('No scan available');

        const httpsUrl = await resolveToHttpsUrl(item.scan_file_url);
        if (!httpsUrl) return res.status(502).send('Failed to resolve file URL');

        const filename = (item.subject || `document-${item.id}`) + '.pdf';
        return streamPdfFromUrl(res, httpsUrl, filename, disposition);
    } catch (err: unknown) {
        logger.error('[bff:legacy-download] error', { message: errorMessage(err) });
        return res.status(500).send('Internal Server Error');
    }
});

export default router;

// --- helpers (reuse your existing OneDrive/Graph resolver if present) ---

async function resolveToHttpsUrl(ref: string): Promise<string | null> {
    if (/^https?:\/\//i.test(ref)) return ref;

    // If you store custom OneDrive tokens, reuse your existing resolver:
    // e.g. onedrive:item:{driveId}:{itemId} → Graph /content 302 → CDN
    try {
        // @ts-ignore - if this exists in your file already, call it:
        const g = global as unknown as { resolveOneDriveDownloadUrl?: unknown };
        if (typeof g.resolveOneDriveDownloadUrl === 'function') {
            return await (g.resolveOneDriveDownloadUrl as (r: string) => Promise<string | null>)(ref);
        }
    } catch (e: unknown) {
        logger.warn('[resolveToHttpsUrl] resolver_failed', { message: errorMessage(e) });
    }
    return null;
}