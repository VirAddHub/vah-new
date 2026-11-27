/**
 * One open account per company. A company number already on an account that is not closed
 * cannot be added to another account (sign-up, profile, extra businesses). Staff can still link
 * a company by hand from Company checks.
 */
import { normaliseCompanyNumber } from './chClient';
import type { Queryable } from './store';

const NORM = (col: string) => `lpad(upper(regexp_replace(COALESCE(${col}, ''), '\\s', '', 'g')), 8, '0')`;

export const COMPANY_TAKEN_MESSAGE = 'This company already has a VirtualAddressHub account. Sign in to that account, or contact support if you need access to it.';

/** The id of another open account that already uses this company number, or null. */
export async function companyNumberInUse(db: Queryable, raw: unknown, exceptUserId?: number | null): Promise<number | null> {
    const n = normaliseCompanyNumber(raw);
    if (!n) return null;
    const except = Number(exceptUserId) || 0;
    const r = await db.query(
        `SELECT u.id FROM "user" u
          WHERE u.deleted_at IS NULL AND COALESCE(u.status, '') <> 'closed' AND u.id <> $2
            AND (${NORM('u.companies_house_number')} = $1 OR ${NORM('u.company_number')} = $1
                 OR EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id AND COALESCE(b.status, 'active') = 'active'
                              AND ${NORM('b.companies_house_number')} = $1))
          LIMIT 1`, [n, except]);
    return r.rows[0] ? Number(r.rows[0].id) : null;
}
