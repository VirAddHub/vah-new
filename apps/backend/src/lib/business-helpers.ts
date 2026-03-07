import { getPool } from './db';

/**
 * Returns the primary business id for a user, or null if none (e.g. before backfill).
 * Use when creating mail_item so new mail is always tied to a business.
 */
export async function getPrimaryBusinessIdForUser(userId: number | string): Promise<number | null> {
  const pool = getPool();
  const result = await pool.query<{ id: number }>(
    'SELECT id FROM business WHERE user_id = $1 AND is_primary = true LIMIT 1',
    [userId]
  );
  return result.rows[0]?.id ?? null;
}
