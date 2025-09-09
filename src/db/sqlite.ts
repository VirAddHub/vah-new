import Database from 'better-sqlite3';
import fs from 'fs';

const DB_PATH = process.env.SQLITE_PATH || 'vah.db';
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '');
const db = new Database(DB_PATH);

function normalize(sql: string) { return sql.replace(/\$\d+/g, '?'); }

export async function ensureSchema() { /* no-op for now */ }

export async function selectOne<T=any>(sql: string, params: any[] = []): Promise<T | null> {
  const stmt = db.prepare(normalize(sql));
  return (stmt as any).get(...params) ?? null;
}

export async function selectMany<T=any>(sql: string, params: any[] = []): Promise<T[]> {
  const stmt = db.prepare(normalize(sql));
  return (stmt as any).all(...params);
}

export async function execute(sql: string, params: any[] = []): Promise<{ rowsAffected: number; lastId?: number }> {
  const stmt = db.prepare(normalize(sql));
  const info = (stmt as any).run(...params);
  return { rowsAffected: info.changes || 0, lastId: info.lastInsertRowid };
}

export async function insertReturningId(sql: string, params: any[] = []): Promise<number> {
  const { lastId } = await execute(sql, params);
  return Number(lastId);
}
