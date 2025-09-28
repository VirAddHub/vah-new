// apps/backend/src/server/db-helpers.ts
import { getPool } from "./db";

export async function selectOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const { rows } = await getPool().query(sql, params);
  return (rows[0] as T) ?? null;
}

export async function selectMany<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const { rows } = await getPool().query(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: any[] = []): Promise<number> {
  const res = await getPool().query(sql, params);
  return res.rowCount ?? 0;
}

export async function insertReturningId(
  sql: string,
  params: any[] = []
): Promise<number | string> {
  const { rows } = await getPool().query(sql, params);
  if (!rows?.length) throw new Error("insertReturningId: no rows returned");
  // Prefer "id" if present; otherwise take the first column.
  const firstRow = rows[0] as Record<string, any>;
  return firstRow.id ?? (Object.values(firstRow)[0] as any);
}
