/**
 * Applies a short, explicit list of migrations at start-up.
 *
 * APPLY_MIGRATIONS_ON_START="20261124_01_user_session_version.sql,20261126_01_ch_verification_file.sql"
 *
 * Only files named here, found in scripts/migrations-pg, and not already recorded in the
 * `migrations` table are applied: each in its own transaction, then recorded. Nothing else runs.
 * This exists because the general script (scripts/migrate-pg.cjs) would also try every older file
 * that this database never recorded. A file that fails stops the start, so a broken schema is not
 * served. Unset the variable once the files are applied.
 */
import fs from 'fs';
import path from 'path';
import { getPool } from './db';
import { logger } from '../lib/logger';

const NAME = /^\d{8}_\d{2}_[a-z0-9_]+\.sql$/;

/** apps/backend/scripts/migrations-pg, found from here whether running from src/ or dist/src/. */
export function findMigrationsDir(start = __dirname): string {
    let d = start;
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(d, 'scripts', 'migrations-pg');
        if (fs.existsSync(candidate)) return candidate;
        d = path.dirname(d);
    }
    throw new Error('scripts/migrations-pg not found');
}

export function requestedBootMigrations(raw = process.env.APPLY_MIGRATIONS_ON_START || ''): string[] {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export async function applyBootMigrations(
    names = requestedBootMigrations(),
    dir = findMigrationsDir(),
): Promise<{ applied: string[]; skipped: string[] }> {
    const applied: string[] = [], skipped: string[] = [];
    if (names.length === 0) return { applied, skipped };
    const pool = getPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    for (const name of names) {
        if (!NAME.test(name)) throw new Error(`boot migration name not allowed: ${name}`);
        const file = path.join(dir, name);
        if (!fs.existsSync(file)) throw new Error(`boot migration not found: ${name}`);
        const done = await pool.query(`SELECT 1 FROM migrations WHERE name = $1`, [name]);
        if (done.rows.length) { skipped.push(name); continue; }
        const sql = fs.readFileSync(file, 'utf8');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`SELECT pg_advisory_xact_lock(hashtext('boot-migrations'))`);
            const again = await client.query(`SELECT 1 FROM migrations WHERE name = $1`, [name]);
            if (again.rows.length) { await client.query('ROLLBACK'); skipped.push(name); continue; }
            await client.query(sql);
            await client.query(`INSERT INTO migrations (name) VALUES ($1)`, [name]);
            await client.query('COMMIT');
            applied.push(name);
        } catch (e) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw new Error(`boot migration ${name} failed: ${(e as Error).message}`);
        } finally {
            client.release();
        }
    }
    logger.info('[boot] migrations', { applied, skipped });
    return { applied, skipped };
}
