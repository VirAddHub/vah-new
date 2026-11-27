/**
 * Pre-incorporation route: a customer who is forming a company that does not exist yet.
 *
 * Policy implemented (from the business risk assessment review, §14):
 *  - the customer declares the proposed company: name, activity, intended directors and owners;
 *    the people named must meet the same identity requirements as for an incorporated company
 *  - an administrator approves it for that one named company (or returns or refuses it)
 *  - the company must be incorporated and its number given to us within 30 days of approval;
 *    otherwise access lapses and an administrator confirms the address was not used
 *  - once the number arrives, the company is treated as a new customer: a company check is
 *    created, the register is compared with this declaration, and full service is paused until
 *    that check is satisfactory (mail is held, not released, in the meantime)
 */
import { z } from 'zod';
import { isCompanyType, preStateFrom, type PreIncState } from './preIncorporationRules';
export { isCompanyType, preStateFrom, type PreIncState };
import { DeclarationSchema } from './declaration';
import { normaliseCompanyNumber, chClient } from './chClient';
import { audit, ensureCheck, refreshSnapshot, syncDiscrepancies, SYSTEM, type Queryable } from './store';

export const DEADLINE_DAYS = 30;
export const ProposedNameSchema = z.string().trim().min(2, 'Enter the proposed company name').max(160);

export function parseProposed(body: any): { ok: true; name: string; declaration: any } | { ok: false; issues: { path: string; message: string }[] } {
    const name = ProposedNameSchema.safeParse(body?.proposed_company_name);
    const rest = { ...(body ?? {}) };
    delete rest.proposed_company_name;
    const decl = DeclarationSchema.safeParse(rest);
    const issues = [
        ...(name.success ? [] : name.error.issues.map(i => ({ path: 'proposed_company_name', message: i.message }))),
        ...(decl.success ? [] : decl.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))),
    ];
    if (issues.length || !name.success || !decl.success) return { ok: false, issues };
    return { ok: true, name: name.data, declaration: decl.data };
}

export async function tableReady(db: Queryable): Promise<boolean> {
    const r = (await db.query(`SELECT to_regclass('public.pre_incorporation') IS NOT NULL AS ok`)).rows[0];
    return !!r?.ok;
}

export async function latestPreIncorporation(db: Queryable, userId: number) {
    return (await db.query(`SELECT * FROM pre_incorporation WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [userId])).rows[0] ?? null;
}


/** What the pre-incorporation route means for access. null = it does not apply to this customer. */
export async function preIncorporationAccess(db: Queryable, userId: number): Promise<{ state: PreIncState; deadline: string | null } | null> {
    const u = (await db.query(`SELECT business_type FROM "user" WHERE id = $1`, [userId])).rows[0];
    if (!isCompanyType(u?.business_type)) return null;
    const ok = await tableReady(db);
    return preStateFrom(ok ? await latestPreIncorporation(db, userId) : null, ok);
}

/**
 * Called when a customer adds their company number. If they were approved before incorporation,
 * the company becomes a new customer: their declaration is carried over and compared with the
 * register by a new company check. Full service pauses until that check is satisfactory.
 */
export async function onCompanyNumberAdded(db: Queryable, userId: number, rawNumber: string) {
    if (!(await tableReady(db))) return null;
    const number = normaliseCompanyNumber(rawNumber);
    if (!number) return null;
    const p = (await db.query(`SELECT * FROM pre_incorporation WHERE user_id = $1 AND status IN ('approved', 'lapsed') ORDER BY id DESC LIMIT 1`, [userId])).rows[0];
    if (!p) return null;
    await db.query(`UPDATE pre_incorporation SET status = 'incorporated', company_number = $2, incorporated_at = NOW(), updated_at = NOW() WHERE id = $1`, [p.id, number]);
    const d = await db.query(
        `INSERT INTO company_declaration (user_id, company_number, data, from_pre_incorporation) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, number, JSON.stringify(p.declaration), p.id]);
    await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('pre_incorporation', $1, 'pre_incorporation_incorporated', $2, NOW())`,
        [String(p.id), JSON.stringify({ user_id: userId, company_number: number, proposed_name: p.proposed_name, declaration_id: Number(d.rows[0].id), late: p.status === 'lapsed' })]);
    const { check } = await ensureCheck(db, userId, number, null);
    await audit(db, SYSTEM, 'company_check_from_pre_incorporation', Number(check.id), { pre_incorporation_id: Number(p.id), proposed_name: p.proposed_name });
    try {
        if (process.env.COMPANIES_HOUSE_API_KEY) await refreshSnapshot(db, chClient(), check);
        else await syncDiscrepancies(db, Number(check.id));
    } catch (e) {
        await db.query(`UPDATE company_check SET fetch_error = $2, updated_at = NOW() WHERE id = $1`, [check.id, (e as Error).message.slice(0, 300)]).catch(() => {});
    }
    return { checkId: Number(check.id) };
}

/** Hourly: approvals past their deadline lapse (access is already withheld from the deadline). */
export async function lapseOverdue(db: Queryable): Promise<number> {
    if (!(await tableReady(db))) return 0;
    const r = await db.query(`UPDATE pre_incorporation SET status = 'lapsed', updated_at = NOW() WHERE status = 'approved' AND deadline_at < NOW() RETURNING id, user_id`);
    for (const row of r.rows) {
        await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('pre_incorporation', $1, 'pre_incorporation_lapsed', $2, NOW())`,
            [String(row.id), JSON.stringify({ user_id: Number(row.user_id) })]);
    }
    return r.rows.length;
}
