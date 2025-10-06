import { Router, Request, Response } from 'express';
import { getPool } from '../server/db';
import { requireAuth } from '../middleware/auth';
import { streamPdfFromUrl } from '../controllers/pdfProxy';

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

    const user = (req as any).user as { id: number; is_admin?: boolean; is_staff?: boolean };

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

    const isOwner = item.user_id === user.id;
    const isPrivileged = !!(user.is_admin || (user as any).is_staff);
    if (!isOwner && !isPrivileged) return res.status(403).send('Forbidden');
    if (item.deleted) return res.status(410).send('Mail item deleted');
    if (!item.scan_file_url) return res.status(404).send('No scan available');

    const httpsUrl = await resolveToHttpsUrl(item.scan_file_url);
    if (!httpsUrl) return res.status(502).send('Failed to resolve file URL');

    const filename = (item.subject || `document-${item.id}`) + '.pdf';
    return streamPdfFromUrl(res, httpsUrl, filename, disposition);
  } catch (err) {
    console.error('[bff:mail/scan-url]', err);
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

    const user = (req as any).user as { id: number; is_admin?: boolean; is_staff?: boolean };

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

    const isOwner = item.user_id === user.id;
    const isPrivileged = !!(user.is_admin || (user as any).is_staff);
    if (!isOwner && !isPrivileged) return res.status(403).send('Forbidden');
    if (item.deleted) return res.status(410).send('Mail item deleted');
    if (!item.scan_file_url) return res.status(404).send('No scan available');

    const httpsUrl = await resolveToHttpsUrl(item.scan_file_url);
    if (!httpsUrl) return res.status(502).send('Failed to resolve file URL');

    const filename = (item.subject || `document-${item.id}`) + '.pdf';
    return streamPdfFromUrl(res, httpsUrl, filename, disposition);
  } catch (err) {
    console.error('[bff:legacy-download]', err);
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
    console.warn('[resolveToHttpsUrl] resolver failed', e);
  }
  return null;
}