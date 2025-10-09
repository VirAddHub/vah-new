import { Pool, PoolClient } from 'pg';
import { BOOTSTRAP_SQL } from './schema';

// Fix database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Add proper connection settings
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20, // Maximum number of clients in the pool
  min: 2,  // Minimum number of clients in the pool
});

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
    try { await c.query(BOOTSTRAP_SQL); await c.query('COMMIT'); console.log('✅ PG schema ensured'); }
    catch (e) { await c.query('ROLLBACK'); console.error('❌ PG bootstrap failed', e); throw e; }
  });
}

export async function selectOne<T=any>(sql: string, params: any[] = []): Promise<T | null> {
  const { rows } = await withClient(c => c.query(sql, params));
  return rows[0] ?? null;
}

export async function selectMany<T=any>(sql: string, params: any[] = []): Promise<T[]> {
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
