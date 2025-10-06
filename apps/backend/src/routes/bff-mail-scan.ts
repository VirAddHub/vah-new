import { Router, Request, Response } from 'express';
import { getPool } from '../server/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

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
      `SELECT id, user_id, deleted, scan_file_url, subject FROM mail_item WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).send('Mail item not found');
    const item = rows[0];

    const isOwner = item.user_id === user.id;
    const isPrivileged = !!(user.is_admin || (user as any).is_staff);
    if (!isOwner && !isPrivileged) return res.status(403).send('Forbidden');
    if (item.deleted) return res.status(410).send('Mail item deleted');
    if (!item.scan_file_url) return res.status(404).send('No scan available');

    const filename = sanitizeFilename((item.subject || `document-${item.id}`) + '.pdf');

    const upstreamUrl = await resolveToHttpsUrl(item.scan_file_url);
    if (!upstreamUrl) return res.status(502).send('Failed to resolve file');

    const r = await fetch(upstreamUrl, { redirect: 'follow', cache: 'no-store' });
    if (!r.ok) {
      const txt = await safeText(r);
      return res.status(r.status).send(txt || 'Upstream fetch failed');
    }

    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'private, max-age=0, no-store, must-revalidate');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);

    return res.status(200).end(buf);
  } catch (err) {
    console.error('[bff:legacy-download] error', err);
    return res.status(500).send('Internal Server Error');
  }
});

export default router;

function sanitizeFilename(name: string) {
  return name.replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 120) || 'document.pdf';
}
async function safeText(r: any) { try { return await r.text(); } catch { return ''; } }

async function resolveToHttpsUrl(ref: string): Promise<string | null> {
  if (/^https?:\/\//i.test(ref)) return ref;
  try {
    if (typeof (global as any).resolveOneDriveDownloadUrl === 'function') {
      return await (global as any).resolveOneDriveDownloadUrl(ref);
    }
  } catch {}
  return null;
}
