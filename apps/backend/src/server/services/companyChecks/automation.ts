/**
 * Company check automation (runs hourly with monitoring, and when the queue is opened):
 *  1. every customer with a company number gets a company check (no Companies House call)
 *  2. checks still under review whose extract is missing, failed or older than 7 days are
 *     retrieved again and re-compared, so administrators find the work already done
 * Nothing here approves a customer or changes a decision, except that a newly detected discrepancy
 * on an approved company re-opens it for review (see store.syncDiscrepancies).
 */
import { normaliseCompanyNumber, ChError, type ChClient } from './chClient';
import { audit, refreshSnapshot, SYSTEM, type Queryable } from './store';

export async function ensureAllChecks(db: Queryable): Promise<number> {
    const t = (await db.query(`SELECT to_regclass('public.company_check') IS NOT NULL AS ok`)).rows[0];
    if (!t?.ok) return 0;
    const rows = (await db.query(`
        SELECT u.id AS user_id, NULL::bigint AS business_id, COALESCE(NULLIF(u.companies_house_number, ''), u.company_number) AS number
          FROM "user" u WHERE u.deleted_at IS NULL AND COALESCE(u.is_admin, false) = false AND COALESCE(NULLIF(u.companies_house_number, ''), u.company_number, '') <> ''
        UNION ALL
        SELECT b.user_id, b.id, b.companies_house_number FROM business b JOIN "user" u ON u.id = b.user_id
         WHERE u.deleted_at IS NULL AND COALESCE(b.status, 'active') = 'active' AND COALESCE(b.companies_house_number, '') <> ''`)).rows;
    let created = 0;
    const seen = new Set<string>();
    for (const r of rows) {
        const n = normaliseCompanyNumber(r.number);
        if (!n || seen.has(`${r.user_id}:${n}`)) continue;
        seen.add(`${r.user_id}:${n}`);
        const ins = await db.query(
            `INSERT INTO company_check (user_id, business_id, company_number) VALUES ($1, $2, $3) ON CONFLICT (user_id, company_number) DO NOTHING RETURNING id`,
            [r.user_id, r.business_id, n]);
        if (ins.rows.length) {
            created++;
            await audit(db, SYSTEM, 'company_check_link', Number(ins.rows[0].id), { user_id: Number(r.user_id), company_number: n, automatic: true });
        }
    }
    return created;
}

export async function refreshPending(db: Queryable, client: ChClient, max = 10) {
    const due = (await db.query(
        `SELECT * FROM company_check WHERE status <> 'satisfactory'
            AND (snapshot IS NULL OR fetch_error IS NOT NULL OR fetched_at < NOW() - interval '7 days')
            AND (updated_at < NOW() - interval '30 minutes' OR snapshot IS NULL)
          ORDER BY fetched_at NULLS FIRST LIMIT $1`, [max])).rows;
    let refreshed = 0, failed = 0;
    for (const check of due) {
        try {
            await refreshSnapshot(db, client, check);
            await audit(db, SYSTEM, 'company_check_refresh', Number(check.id), { automatic: true });
            refreshed++;
        } catch (e) {
            if (e instanceof ChError && e.code === 'rate_limited') break;
            failed++;
            await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]);
        }
    }
    return { refreshed, failed };
}
