/**
 * Ongoing monitoring of companies with monitoring turned on (every satisfactory check, by default).
 * Each company is re-read from Companies House about once a day. Any change to the watched parts of
 * the register (status, name, registered office, SIC codes, insolvency, overdue filings, officers,
 * PSCs, PSC statements, possible disqualifications) raises an alert for administrators.
 *
 * Alerts do not change the customer's service by themselves: an administrator reviews the alert and,
 * where needed, moves the check to "further investigation", which pauses full service.
 */
import { logger } from '../../../lib/logger';
import { ChError, createChClient, type ChClient } from './chClient';
import { diffSnapshots, fetchSnapshot, snapshotHash } from './snapshot';
import { audit, type Queryable } from './store';

const LOCK_KEY = 72_631_127; // pg advisory lock: one runner across instances
const DUE_AFTER_HOURS = 24;

export async function runMonitoringOnce(db: Queryable & { connect?: () => Promise<any> }, client: ChClient, opts: { max?: number } = {}) {
    const max = opts.max ?? 25;
    const result = { checked: 0, alerts: 0, errors: 0, skipped: false };
    const conn: any = db.connect ? await db.connect() : db;
    try {
        const lock = await conn.query(`SELECT pg_try_advisory_lock($1) AS ok`, [LOCK_KEY]);
        if (!lock.rows[0]?.ok) { result.skipped = true; return result; }
        try {
            const due = (await conn.query(
                `SELECT * FROM company_check WHERE monitoring = true AND snapshot IS NOT NULL
                   AND (last_monitored_at IS NULL OR last_monitored_at < NOW() - ($1 || ' hours')::interval)
                 ORDER BY last_monitored_at NULLS FIRST LIMIT $2`, [String(DUE_AFTER_HOURS), max])).rows;
            for (const check of due) {
                try {
                    const fresh = await fetchSnapshot(client, check.company_number);
                    const changes = diffSnapshots(check.snapshot, fresh);
                    if (changes.length) {
                        const a = await conn.query(`INSERT INTO company_check_alert (check_id, changes) VALUES ($1, $2) RETURNING id`, [check.id, JSON.stringify(changes)]);
                        await audit(conn, null, 'company_check_alert_raised', Number(check.id), { alert_id: Number(a.rows[0].id), fields: changes.map(c => c.field) });
                        result.alerts++;
                    }
                    await conn.query(
                        `UPDATE company_check SET snapshot = $2, snapshot_hash = $3, fetched_at = NOW(), fetch_error = NULL, last_monitored_at = NOW(),
                                company_name = COALESCE($4, company_name) WHERE id = $1`,
                        [check.id, JSON.stringify(fresh), snapshotHash(fresh), fresh.profile?.company_name ?? null]);
                    result.checked++;
                } catch (e) {
                    if (e instanceof ChError && e.code === 'rate_limited') break; // try again next run
                    result.errors++;
                    await conn.query(`UPDATE company_check SET fetch_error = $2, last_monitored_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]);
                    if (e instanceof ChError && e.code === 'not_found') {
                        const a = await conn.query(`INSERT INTO company_check_alert (check_id, changes) VALUES ($1, $2) RETURNING id`,
                            [check.id, JSON.stringify([{ field: 'company', label: 'Company record', before: check.company_number, after: 'No longer found at Companies House' }])]);
                        await audit(conn, null, 'company_check_alert_raised', Number(check.id), { alert_id: Number(a.rows[0].id), fields: ['company'] });
                        result.alerts++;
                    }
                }
            }
        } finally {
            await conn.query(`SELECT pg_advisory_unlock($1)`, [LOCK_KEY]);
        }
    } finally {
        if (conn !== db) conn.release?.();
    }
    return result;
}

/** Starts the hourly sweep. Off when there is no API key or COMPANY_MONITORING=off. */
export function startCompanyMonitoring(getDb: () => any): (() => void) | null {
    if (!process.env.COMPANIES_HOUSE_API_KEY || process.env.COMPANY_MONITORING === 'off' || process.env.NODE_ENV === 'test') return null;
    const tick = async () => {
        try {
            const t = (await getDb().query(`SELECT to_regclass('public.company_check') IS NOT NULL AS ok`)).rows[0];
            if (!t?.ok) return;
            const r = await runMonitoringOnce(getDb(), createChClient());
            if (r.checked || r.alerts || r.errors) logger.info('[companyChecks] monitoring run', r);
        } catch (e) {
            logger.warn('[companyChecks] monitoring run failed', { message: (e as Error)?.message });
        }
    };
    const first = setTimeout(tick, 2 * 60 * 1000);
    const every = setInterval(tick, 60 * 60 * 1000);
    first.unref?.(); every.unref?.();
    return () => { clearTimeout(first); clearInterval(every); };
}
