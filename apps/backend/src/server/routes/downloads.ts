/**
 * Downloads Route
 *
 * GET /api/downloads/export/:token
 *   — Token-gated GDPR export ZIP download (no JWT required — token IS the auth).
 *   — Only serves files in status='done' with a non-expired, valid token.
 *   — Streams the ZIP directly from the local filesystem.
 *   — Returns 410 Gone if the token has expired.
 *   — Returns 503 if the export_job table does not exist (migration not run).
 *
 * Security model:
 *   - Token is 32-byte hex (generated in gdpr-export.ts) — cryptographically unguessable.
 *   - No JWT required; the opaque token provides the access control.
 *   - file_path is never exposed to the client — only streamed.
 *   - Expiry is checked server-side before streaming begins.
 */

import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

/**
 * GET /api/downloads/export/:token
 *
 * Streams the GDPR export ZIP if the token is valid and not expired.
 * No authentication middleware — the token itself is the credential.
 */
router.get('/export/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token ?? '').trim();
  if (!token) return res.status(400).send('Missing token');

  const pool = getPool();

  try {
    // Look up the export job by token
    const result = await pool.query(
      `SELECT id, status, file_path, file_size, expires_at
       FROM export_job
       WHERE token = $1`,
      [token],
    );

    const row = result.rows[0] ?? null;

    if (!row || row.status !== 'done') {
      return res.status(404).send('Not found');
    }

    // expires_at stored as millisecond epoch bigint
    const expiresAt = row.expires_at != null ? Number(row.expires_at) : null;
    if (!expiresAt || Date.now() > expiresAt) {
      return res.status(410).send('Expired');
    }

    // Verify the file still exists on disk
    const filePath = String(row.file_path ?? '');
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const filename = path.basename(filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream directly — do not buffer the whole file in memory
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[downloads] stream error:', err);
      // Headers already sent at this point; just destroy
      res.destroy();
    });
    stream.pipe(res);
  } catch (e: any) {
    if (e?.code === '42P01') {
      return res.status(503).send('export_job table not available');
    }
    console.error('[downloads] export/:token error:', e?.message ?? e);
    return res.status(500).send('Internal error');
  }
});

export default router;
