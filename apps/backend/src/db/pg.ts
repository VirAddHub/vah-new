import type { PoolClient } from 'pg';
import { getPool } from '../lib/db';
import { logger } from '../lib/logger';
import { BOOTSTRAP_SQL } from './schema';

// One pool per process: use the shared pool from lib/db (max PGPOOL_MAX, default 20). This module
// used to create a second pool of 20, so one API instance could open up to 40 connections.
const pool = { connect: () => getPool().connect() };

async function withClient<T>(fn: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

export async function ensureSchema() {
  await withClient(async c => {
    await c.query('BEGIN');
    try { await c.query(BOOTSTRAP_SQL); await c.query('COMMIT'); logger.info('✅ PG schema ensured'); }
    catch (e) { await c.query('ROLLBACK'); logger.error('❌ PG bootstrap failed', e); throw e; }
  });
}

export async function selectOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const { rows } = await withClient(c => c.query(sql, params));
  return rows[0] ?? null;
}

export async function selectMany<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { rows } = await withClient(c => c.query(sql, params));
  return rows as T[];
}

export async function execute(sql: string, params: any[] = []): Promise<{ rowsAffected: number }> {
  const { rowCount } = await withClient(c => c.query(sql, params));
  return { rowsAffected: rowCount || 0 };
}

export async function insertReturningId(sql: string, params: any[] = []): Promise<number> {
  const { rows } = await withClient(c => c.query(sql, params));
  if (!rows[0] || typeof rows[0].id === 'undefined') throw new Error('insertReturningId: add `RETURNING id` to INSERT when using PG');
  return Number(rows[0].id);
}
