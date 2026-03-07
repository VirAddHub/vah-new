// src/server/routes/account-businesses.ts
// Account businesses API: list, create, update, set-primary. All require auth and ownership.

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { getMonthlyPricePenceForNextBusiness } from '../../lib/business-pricing';
import { logger } from '../../lib/logger';
import { safeErrorMessage } from '../../lib/safeError';
import { param } from '../../lib/express-params';

const router = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'unauthenticated' });
  }
  next();
}

/** GET /api/account/businesses — all businesses for the logged-in user */
router.get('/businesses', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT id, user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at
       FROM business
       WHERE user_id = $1
       ORDER BY is_primary DESC, created_at ASC`,
      [userId]
    );
    const list = (result.rows as Record<string, unknown>[]).map((row) => ({
      ...row,
      display_price_pence: row.monthly_price_pence,
    }));
    return res.json({ ok: true, data: list });
  } catch (e) {
    logger.error('[account/businesses] list error', { message: safeErrorMessage(e) });
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});

/** POST /api/account/businesses — create an additional business */
router.post('/businesses', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const pool = getPool();
  const body = req.body || {};
  const company_name = typeof body.company_name === 'string' ? body.company_name.trim() : '';
  const trading_name = typeof body.trading_name === 'string' ? body.trading_name.trim() || null : null;
  const companies_house_number =
    typeof body.companies_house_number === 'string' ? body.companies_house_number.trim() || null : null;

  if (!company_name) {
    return res.status(400).json({ ok: false, error: 'company_name_required' });
  }

  try {
    const countResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM business WHERE user_id = $1',
      [userId]
    );
    const existingCount = parseInt(countResult.rows[0]?.count ?? '0', 10);
    const monthly_price_pence = getMonthlyPricePenceForNextBusiness(existingCount);

    const isPrimaryResult = await pool.query('SELECT 1 FROM business WHERE user_id = $1 LIMIT 1', [userId]);
    const is_primary = isPrimaryResult.rows.length === 0;
    const now = Date.now();

    const insert = await pool.query(
      `INSERT INTO business (user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $7)
       RETURNING id, user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at`,
      [userId, company_name, trading_name, companies_house_number, is_primary, monthly_price_pence, now]
    );
    const row = insert.rows[0] as Record<string, unknown>;
    return res.status(201).json({ ok: true, data: { ...row, display_price_pence: row.monthly_price_pence } });
  } catch (e) {
    logger.error('[account/businesses] create error', { message: safeErrorMessage(e) });
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});

/** GET /api/account/businesses/:businessId — one business (ownership check) */
router.get('/businesses/:businessId', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const businessId = param(req, 'businessId');
  const id = businessId ? parseInt(businessId, 10) : NaN;
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: 'invalid_id' });
  }
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT id, user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at
       FROM business WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    const row = result.rows[0] as Record<string, unknown>;
    return res.json({ ok: true, data: { ...row, display_price_pence: row.monthly_price_pence } });
  } catch (e) {
    logger.error('[account/businesses] get error', { message: safeErrorMessage(e) });
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});

/** PATCH /api/account/businesses/:businessId — update editable fields */
router.patch('/businesses/:businessId', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const businessId = param(req, 'businessId');
  const id = businessId ? parseInt(businessId, 10) : NaN;
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: 'invalid_id' });
  }
  const body = req.body || {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let pos = 1;
  if (typeof body.company_name === 'string') {
    const v = body.company_name.trim();
    if (!v) return res.status(400).json({ ok: false, error: 'company_name_required' });
    updates.push(`company_name = $${pos++}`);
    values.push(v);
  }
  if (body.trading_name !== undefined) {
    updates.push(`trading_name = $${pos++}`);
    values.push(typeof body.trading_name === 'string' ? body.trading_name.trim() || null : null);
  }
  if (body.companies_house_number !== undefined) {
    updates.push(`companies_house_number = $${pos++}`);
    values.push(typeof body.companies_house_number === 'string' ? body.companies_house_number.trim() || null : null);
  }
  if (updates.length === 0) {
    const pool = getPool();
    const r = await pool.query(
      'SELECT id, user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at FROM business WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'not_found' });
    const row = r.rows[0] as Record<string, unknown>;
    return res.json({ ok: true, data: { ...row, display_price_pence: row.monthly_price_pence } });
  }
  values.push(Date.now(), id, userId);
  updates.push(`updated_at = $${pos++}`);
  const pool = getPool();
  try {
    const result = await pool.query(
      `UPDATE business SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1}
       RETURNING id, user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    const row = result.rows[0] as Record<string, unknown>;
    return res.json({ ok: true, data: { ...row, display_price_pence: row.monthly_price_pence } });
  } catch (e) {
    logger.error('[account/businesses] patch error', { message: safeErrorMessage(e) });
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});

/** POST /api/account/businesses/:businessId/set-primary — set as primary */
router.post('/businesses/:businessId/set-primary', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const businessId = param(req, 'businessId');
  const id = businessId ? parseInt(businessId, 10) : NaN;
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: 'invalid_id' });
  }
  const pool = getPool();
  try {
    await pool.query('UPDATE business SET is_primary = false WHERE user_id = $1', [userId]);
    const result = await pool.query(
      'UPDATE business SET is_primary = true WHERE id = $1 AND user_id = $2 RETURNING id, company_name, is_primary',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    return res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    logger.error('[account/businesses] set-primary error', { message: safeErrorMessage(e) });
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
});

export default router;
