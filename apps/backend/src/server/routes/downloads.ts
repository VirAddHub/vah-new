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

import { clientKey } from '../lib/clientKey';
import path from 'path';
import { logger } from '../../lib/logger';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getPool } from '../db';

const router = Router();

// Must match the constant in gdpr-export.ts — used to validate file_path before streaming.
const EXPORT_DIR = path.resolve(process.cwd(), 'var/local/exports');

/** Token is unguessable, but cap per-IP DB hits and bandwidth if URLs leak or scanners hit the route. */
const gdprExportDownloadIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientKey(req),
  handler: (_req, res) => {
    res.setHeader('Retry-After', '900');
    return res.status(429).send('Too many requests');
  },
});

/**
 * Delete a GDPR export ZIP (and nullify its path in the DB) after the download
 * completes or errors. Errors during cleanup are logged but never thrown so they
 * cannot affect an already-sent HTTP response.
 */
async function cleanupExportFile(jobId: number, filePath: string): Promise<void> {
  try {
    await fs.promises.rm(filePath, { force: true });
    logger.info('[downloads] cleaned up export file', { jobId, filePath });
  } catch (err) {
    logger.error('[downloads] failed to delete export file (non-fatal)', { jobId, filePath, err });
  }

  // Nullify file_path in DB so future requests get 404 rather than trying a missing file
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE export_job SET file_path = NULL WHERE id = $1`,
      [jobId],
    );
  } catch (err) {
    logger.error('[downloads] failed to nullify file_path in DB (non-fatal)', { jobId, err });
  }
}

/**
 * GET /api/downloads/export/:token
 *
 * Streams the GDPR export ZIP if the token is valid and not expired.
 * No authentication middleware — the token itself is the credential.
 */
router.get('/export/:token', gdprExportDownloadIpLimiter, async (req: Request, res: Response) => {
  // Private, token-authorised export: never store in browser or shared caches (security review F18).
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
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
      // Clean up the file for expired tokens so PII does not linger on disk
      if (row.file_path) {
        cleanupExportFile(row.id, String(row.file_path)).catch(() => {/* already logged inside */});
      }
      return res.status(410).send('Expired');
    }

    // Verify the file still exists on disk
    const filePath = String(row.file_path ?? '');
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Fix L-2: Validate the resolved path is within EXPORT_DIR to prevent path traversal
    // if the DB row were ever tampered with.
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(EXPORT_DIR + path.sep) && resolvedPath !== EXPORT_DIR) {
      logger.warn('[downloads] path traversal attempt blocked', { jobId: row.id, filePath });
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const filename = path.basename(resolvedPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream directly — do not buffer the whole file in memory
    const stream = fs.createReadStream(resolvedPath);

    stream.on('error', (err) => {
      logger.error('[downloads] stream error:', err);
      // Headers may already be sent; destroy the socket rather than sending a second response
      res.destroy();
      // Best-effort cleanup even on stream error
      cleanupExportFile(row.id, resolvedPath).catch(() => {/* already logged inside */});
    });

    // Fix H-5: Delete the ZIP after it has been fully streamed to the client
    stream.on('end', () => {
      cleanupExportFile(row.id, resolvedPath).catch(() => {/* already logged inside */});
    });

    stream.pipe(res);
  } catch (e: any) {
    if (e?.code === '42P01') {
      return res.status(503).send('export_job table not available');
    }
    logger.error('[downloads] export/:token error:', e?.message ?? e);
    return res.status(500).send('Internal error');
  }
});

export default router;
