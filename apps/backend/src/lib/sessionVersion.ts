import { getPool } from '../server/db';
import { logger } from './logger';

/**
 * Server-side session revocation (security review F20, R32, R33).
 *
 * Tokens carry `sv` (the user's session_version when issued). Incrementing the column invalidates every
 * outstanding token for that user. Until migration 20261124_01_user_session_version.sql is applied the column is missing: then checks
 * are skipped (current behaviour) and a warning is logged once, so nothing breaks before the migration.
 */
let columnPresent: Promise<boolean> | null = null;

export function hasSessionVersionColumn(): Promise<boolean> {
    const existing = columnPresent;
    if (existing) return existing;
    {
        const probe: Promise<boolean> = getPool()
            .query(
                `SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'user' AND column_name = 'session_version' LIMIT 1`
            )
            .then((r) => {
                const present = r.rows.length > 0;
                if (!present) {
                    logger.warn('[session] session_version column missing — apply migration 20261124_01_user_session_version.sql to enable server-side sign-out');
                }
                return present;
            })
            .catch((err) => {
                columnPresent = null; // retry next time
                logger.warn('[session] session_version_probe_failed', { message: err?.message });
                return false;
            });
        columnPresent = probe;
        return probe;
    }
}

/** Test hook. */
export function resetSessionVersionProbe(): void {
    columnPresent = null;
}

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<unknown> };

/** Sign the user out everywhere. Safe to call inside a transaction (pass the client). */
export async function bumpSessionVersion(userId: number | string, db: Queryable = getPool()): Promise<void> {
    if (!(await hasSessionVersionColumn())) return;
    await db.query(`UPDATE "user" SET session_version = session_version + 1 WHERE id = $1`, [userId]);
}

/** Absolute session lifetime, independent of activity (security review F29). */
export const SESSION_ABSOLUTE_MAX_SECONDS = 24 * 60 * 60;

/** The user's current session_version (0 when the column is not there yet). */
export async function currentSessionVersion(userId: number | string): Promise<number> {
    if (!(await hasSessionVersionColumn())) return 0;
    const r = await getPool().query(`SELECT session_version FROM "user" WHERE id = $1`, [userId]);
    return Number(r.rows[0]?.session_version ?? 0);
}

/** True when the session started longer ago than the absolute lifetime allows. */
export function isPastAbsoluteLifetime(payload: { auth_time?: number; iat?: number }, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const started = typeof payload.auth_time === 'number' ? payload.auth_time : payload.iat;
    return typeof started === 'number' && nowSeconds - started > SESSION_ABSOLUTE_MAX_SECONDS;
}

/** A token issued before session versions existed has no `sv`; treat it as version 0. */
export function sessionVersionMatches(payload: { sv?: number }, dbVersion: number): boolean {
    return Number(payload.sv ?? 0) === Number(dbVersion ?? 0);
}
