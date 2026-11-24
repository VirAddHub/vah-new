/**
 * GDPR Export Routes
 *
 * POST /api/gdpr-export/export/request  — queue a new GDPR data export job
 * GET  /api/gdpr-export/export/status   — check the status of the latest export job
 *
 * Authentication: JWT required (via global middleware).
 * Rate-limited: Express user-scoped bucket on all routes here (see gdprExportHttpUserLimiter) plus
 * 1 job per 12 hours per user inside POST /export/request.
 * Privacy: file_path is never exposed to the client; only a signed token + download URL.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { gdprExportHttpUserLimiter } from '../../lib/routeGroupRateLimits';
import { logger } from '../../lib/logger';

// Dynamically import archiver and fs-extra at call time to avoid top-level import errors
// if those deps are missing from some environments. Both are already in package.json.
import fse from 'fs-extra';
import archiver from 'archiver';

const router = Router();

router.use(gdprExportHttpUserLimiter);

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPORT_DIR = path.resolve(process.cwd(), 'var/local/exports');
const THROTTLE_MS = 12 * 60 * 60 * 1000; // 12 hours
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Shape a raw export_job DB row into the response object we send to clients.
 * Never exposes file_path. Uses APP_ORIGIN env var for download URL base.
 */
function shapeJob(j: Record<string, unknown> | null) {
  if (!j) return null;
  const base = process.env.APP_ORIGIN || 'http://localhost:3000';
  const expiresAt = j.expires_at as number | null;
  const download =
    j.status === 'done' && j.token && expiresAt && Date.now() < expiresAt
      ? `${base}/api/bff/downloads/export/${j.token}`
      : null;
  return {
    id: j.id,
    status: j.status,
    created_at: j.created_at,
    started_at: j.started_at,
    completed_at: j.completed_at,
    error: j.error ?? null,
    size: j.file_size ?? null,
    download,
    expires_at: expiresAt ?? null,
  };
}

/**
 * Insert an in-app notification row (Postgres-native, non-fatal).
 * Replaces legacy SQLite notify() from lib/notify.js.
 */
async function notifyUser(opts: {
  userId: number;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
}): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO notification (user_id, type, title, body, meta, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)`,
      [opts.userId, opts.type, opts.title, opts.body, JSON.stringify(opts.meta), Date.now()],
    );
  } catch (err) {
    logger.error('[gdpr-export] notifyUser failed (non-fatal):', { error: err });
  }
}

/**
 * runGdprExport — async background job.
 * Ported from lib/gdpr-export.js; now uses Postgres pool directly.
 * Called with setImmediate after the HTTP response is sent.
 */
async function runGdprExport(jobId: number): Promise<void> {
  const pool = getPool();

  try {
    // Mark running
    const jobCheck = await pool.query(
      `SELECT id, status FROM export_job WHERE id = $1`,
      [jobId],
    );
    const job = jobCheck.rows[0];
    if (!job || job.status !== 'pending') return;

    await pool.query(
      `UPDATE export_job SET status = 'running', started_at = $1 WHERE id = $2`,
      [Date.now(), jobId],
    );
  } catch (e: any) {
    if (e?.code === '42P01') {
      logger.warn('[gdpr-export] export_job table missing; skipping job', { jobId });
      return;
    }
    throw e;
  }

  let tempDir: string | null = null;
  let zipPath: string | null = null;
  let finished = false;
  try {
    const jobResult = await pool.query(`SELECT id, user_id FROM export_job WHERE id = $1`, [jobId]);
    const job = jobResult.rows[0];
    if (!job) return;

    // Gather user data
    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, created_at,
              sumsub_applicant_id, sumsub_review_status,
              stripe_customer_id,
              email_pref_marketing, email_pref_product, email_pref_security,
              email_unsubscribed_at, email_bounced_at
       FROM "user" WHERE id = $1`,
      [job.user_id],
    );
    const user = userResult.rows[0] ?? {};

    const mailItemsResult = await pool.query(
      `SELECT id, created_at, subject, sender_name, notes, tag, status, scanned, deleted
       FROM mail_item WHERE user_id = $1 ORDER BY created_at DESC`,
      [job.user_id],
    );

    const postmarkEventsResult = await pool.query(
      `SELECT id, created_at, type, email
       FROM postmark_event WHERE user_id = $1 ORDER BY created_at DESC`,
      [job.user_id],
    ).catch(() => ({ rows: [] })); // table may not exist — non-fatal

    // Write temp JSON files and zip
    await fse.ensureDir(EXPORT_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    zipPath = path.join(EXPORT_DIR, `gdpr-u${job.user_id}-${stamp}.zip`);
    tempDir = await fse.mkdtemp(path.join(EXPORT_DIR, `tmp-${job.user_id}-`));

    const files = [
      { name: 'user.json', data: user },
      { name: 'mail_items.json', data: mailItemsResult.rows },
      { name: 'postmark_events.json', data: postmarkEventsResult.rows },
      {
        name: 'metadata.json',
        data: { job_id: jobId, generated_at: new Date().toISOString(), version: 'gdpr_v1' },
      },
    ];

    for (const f of files) {
      await fse.writeFile(path.join(tempDir!, f.name), JSON.stringify(f.data, null, 2), 'utf8');
    }

    // Stream to ZIP
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath!);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      for (const f of files) {
        archive.file(path.join(tempDir!, f.name), { name: f.name });
      }
      archive.finalize();
    });

    // Finalise job row
    const stat = await fse.stat(zipPath!);
    const token = newToken(32);
    const expiresAt = Date.now() + TOKEN_TTL_MS;

    await pool.query(
      `UPDATE export_job
       SET status = 'done', completed_at = $1, file_path = $2, file_size = $3,
           token = $4, expires_at = $5
       WHERE id = $6`,
      [Date.now(), zipPath, stat.size, token, expiresAt, jobId],
    );

    // In-app notification
    const appOrigin = process.env.APP_ORIGIN || 'http://localhost:3000';
    const url = `${appOrigin}/api/bff/downloads/export/${token}`;
    await notifyUser({
      userId: job.user_id,
      type: 'export',
      title: 'Your data export is ready',
      body: 'Click to download. Link expires in 24 hours.',
      meta: { token, url, size: stat.size },
    });
    finished = true;
  } catch (err: any) {
    try {
      await pool.query(
        `UPDATE export_job SET status = 'error', error = $1, completed_at = $2 WHERE id = $3`,
        [String(err?.message ?? err), Date.now(), jobId],
      );
    } catch (updateErr: any) {
      if (updateErr?.code === '42P01') {
        logger.warn('[gdpr-export] export_job table missing; cannot update error status for job', { jobId });
      } else {
        logger.error('[gdpr-export] failed to update error status:', { message: updateErr?.message ?? updateErr });
      }
    }
  } finally {
    // Never leave personal-data files behind from a failed or finished run (security review F39).
    if (tempDir) await fse.remove(tempDir).catch(() => undefined);
    if (!finished && zipPath) await fse.remove(zipPath).catch(() => undefined);
  }
}

/**
 * Deletes export archives whose download link has expired even if nobody ever requested them, plus
 * stray temp folders, so personal data does not stay on disk (security review F39). Runs hourly.
 */
export async function sweepExpiredExports(now = Date.now()): Promise<number> {
  const pool = getPool();
  let removed = 0;
  try {
    const expired = await pool.query(
      `SELECT id, file_path FROM export_job
        WHERE file_path IS NOT NULL AND expires_at IS NOT NULL AND expires_at < $1`,
      [now],
    );
    for (const row of expired.rows) {
      const resolved = path.resolve(String(row.file_path));
      if (resolved.startsWith(EXPORT_DIR + path.sep)) {
        await fse.remove(resolved).catch(() => undefined);
      }
      await pool.query(`UPDATE export_job SET file_path = NULL, token = NULL WHERE id = $1`, [row.id]);
      removed++;
    }
  } catch (e: any) {
    if (e?.code !== '42P01') logger.warn('[gdpr-export] sweep_failed', { message: e?.message });
  }
  try {
    if (await fse.pathExists(EXPORT_DIR)) {
      for (const name of await fse.readdir(EXPORT_DIR)) {
        if (!name.startsWith('tmp-')) continue;
        const full = path.join(EXPORT_DIR, name);
        const st = await fse.stat(full).catch(() => null);
        if (st && now - st.mtimeMs > 60 * 60 * 1000) await fse.remove(full).catch(() => undefined);
      }
    }
  } catch { /* best effort */ }
  return removed;
}

if (process.env.NODE_ENV !== 'test') {
  const sweeper = setInterval(() => { void sweepExpiredExports(); }, 60 * 60 * 1000);
  sweeper.unref?.();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/gdpr-export/export/request
 * Queues a new GDPR export job for the authenticated user.
 * Throttled: returns an existing job if one was created in the last 12 hours.
 */
router.post('/export/request', async (req: Request, res: Response) => {
  const userId = Number(req.user?.id ?? 0);
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const pool = getPool();
  try {
    // Throttle check: return existing recent/running job
    const recentResult = await pool.query(
      `SELECT * FROM export_job
       WHERE user_id = $1 AND type = 'gdpr_v1'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const recent = recentResult.rows[0] ?? null;
    const now = Date.now();

    if (
      recent &&
      (recent.status === 'pending' ||
        recent.status === 'running' ||
        (recent.status === 'done' && now - Number(recent.created_at) < THROTTLE_MS))
    ) {
      return res.status(202).json({ ok: true, job: shapeJob(recent) });
    }

    // Insert new job
    const insertResult = await pool.query(
      `INSERT INTO export_job (user_id, type, status, created_at)
       VALUES ($1, 'gdpr_v1', 'pending', $2)
       RETURNING *`,
      [userId, now],
    );
    const newJob = insertResult.rows[0];

    // Kick off async export without blocking the HTTP response
    setImmediate(() => {
      runGdprExport(newJob.id).catch((err) => {
        logger.error('[gdpr-export] runGdprExport error:', { message: err?.message ?? err });
      });
    });

    return res.status(202).json({ ok: true, job: shapeJob(newJob) });
  } catch (e: any) {
    if (e?.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'export_job table not available' });
    }
    logger.error('[gdpr-export] POST /export/request error:', { message: e?.message ?? e });
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
});

/**
 * GET /api/gdpr-export/export/status
 * Returns the latest export job for the authenticated user.
 */
router.get('/export/status', async (req: Request, res: Response) => {
  const userId = Number(req.user?.id ?? 0);
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT * FROM export_job
       WHERE user_id = $1 AND type = 'gdpr_v1'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const row = result.rows[0] ?? null;
    return res.json({ ok: true, job: shapeJob(row) });
  } catch (e: any) {
    if (e?.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'export_job table not available' });
    }
    logger.error('[gdpr-export] GET /export/status error:', { message: e?.message ?? e });
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
});

export default router;
