import { Router, Request, Response } from 'express';
import { getPool } from '../server/db';
import { requireAuth } from '../middleware/auth';
import { streamPdfFromUrl } from '../controllers/pdfProxy';
import { logger } from '../lib/logger';

const router = Router();

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
        const dbUserId =
            typeof item.user_id === 'bigint' ? Number(item.user_id) :
                typeof item.user_id === 'string' ? parseInt(item.user_id, 10) :
                    Number(item.user_id);
        const sessionUserId =
            typeof user.id === 'bigint' ? Number(user.id) :
                typeof user.id === 'string' ? parseInt(user.id as any, 10) :
                    Number(user.id);

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
    } catch (err) {
        logger.error('[bff:mail/scan-url] error', { message: (err as any)?.message ?? String(err) });
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

        const dbUserId =
            typeof item.user_id === 'bigint' ? Number(item.user_id) :
                typeof item.user_id === 'string' ? parseInt(item.user_id, 10) :
                    Number(item.user_id);
        const sessionUserId =
            typeof user.id === 'bigint' ? Number(user.id) :
                typeof user.id === 'string' ? parseInt(user.id as any, 10) :
                    Number(user.id);
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
    } catch (err) {
        logger.error('[bff:legacy-download] error', { message: (err as any)?.message ?? String(err) });
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
        if (typeof (global as any).resolveOneDriveDownloadUrl === 'function') {
            return await (global as any).resolveOneDriveDownloadUrl(ref);
        }
    } catch (e) {
        logger.warn('[resolveToHttpsUrl] resolver_failed', { message: (e as any)?.message ?? String(e) });
    }
    return null;
}