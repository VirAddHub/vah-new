/**
 * Admin Repair Routes
 *
 * POST /api/admin-repair/fts           — 410 Gone (FTS disabled permanently)
 * POST /api/admin-repair/fts/rebuild   — 410 Gone (FTS disabled permanently)
 * POST /api/admin-repair/backfill-expiry — Backfills expires_at on mail_item rows that are missing it
 *
 * The FTS endpoints are tombstoned to prevent accidental re-activation.
 * backfill-expiry is an admin-only data repair operation.
 *
 * Fixed from JS original:
 *   - `isAllowed` was called but never defined → ReferenceError at runtime
 *   - `db` was used but never imported → second ReferenceError
 *   - `db.transaction()` was SQLite-era → replaced with Postgres pool.query()
 */

import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';

const router = Router();

/** Data repair — rare; tight cap per admin to limit blast radius if creds leak. */
const adminRepairMutationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as { user?: { id?: number } }).user;
    return u?.id != null ? `admin-repair:mutation:${u.id}` : ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res) => {
    res.setHeader('Retry-After', '3600');
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

// ─── FTS tombstones (intentionally disabled) ──────────────────────────────────

/**
 * POST /api/admin-repair/fts
 * Permanently disabled — FTS removed to prevent database corruption.
 */
router.post('/fts', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'FTS is disabled in this build.' });
});

/**
 * POST /api/admin-repair/fts/rebuild
 * Permanently disabled — FTS removed to prevent database corruption.
 */
router.post('/fts/rebuild', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'FTS is disabled in this build.' });
});

// ─── Backfill expiry ──────────────────────────────────────────────────────────

/**
 * POST /api/admin-repair/backfill-expiry
 * Admin-only data repair: sets expires_at = created_at + STORAGE_RETENTION_DAYS
 * on all mail_item rows where expires_at IS NULL and created_at IS NOT NULL.
 *
 * Idempotent — safe to run multiple times (WHERE expires_at IS NULL guard).
 * Uses STORAGE_RETENTION_DAYS env var (default 14 days).
 */
router.post('/backfill-expiry', adminRepairMutationLimiter, async (req: Request, res: Response) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const days  = Number(process.env.STORAGE_RETENTION_DAYS ?? 14) || 14;
  const delta = days * 24 * 60 * 60 * 1000; // ms
  const now   = Date.now();

  try {
    const pool = getPool();

    const result = await pool.query(
      `UPDATE mail_item
       SET expires_at = created_at + $1
       WHERE expires_at IS NULL
         AND created_at IS NOT NULL`,
      [delta],
    );

    const updated = result.rowCount ?? 0;

    console.log(`[admin-repair] backfill-expiry: updated ${updated} rows (days=${days})`);
    return res.json({ ok: true, updated, days, now });
  } catch (error: any) {
    console.error('[POST /api/admin-repair/backfill-expiry] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
  }
});

export default router;
