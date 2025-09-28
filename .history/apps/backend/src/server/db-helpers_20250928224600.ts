import { pool } from './db';

export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { rows } = await pool.query(sql, params);
    return rows[0] ?? null;
}

export async function many<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { rows } = await pool.query(sql, params);
    return rows as T[];
}
