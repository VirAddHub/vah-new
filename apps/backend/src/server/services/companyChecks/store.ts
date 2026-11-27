/** Database access for company checks. All writes that matter for compliance are audited by the caller. */
import { getPool } from '../../db';
import { analyse, type CustomerInfo } from './analysis';
import { normaliseCompanyNumber, type ChClient } from './chClient';
import { fetchSnapshot, snapshotHash, type Snapshot } from './snapshot';
import { buildReportContent, contentHash, renderReportPdf } from './report';

export type Queryable = { query: (sql: string, args?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> };

export async function audit(db: Queryable, adminId: number | null, action: string, checkId: number | null, details: Record<string, unknown>) {
    if (adminId === null) {
        // Raised by the system (monitoring), not by an administrator.
        await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('company_check', $1, $2, $3, NOW())`,
            [String(checkId), action, JSON.stringify(details)]);
        return;
    }
    await db.query(
        `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, $2, 'company_check', $3, $4, NOW())`,
        [adminId, action, checkId, JSON.stringify(details)]);
}

export async function loadCustomer(db: Queryable, userId: number, businessId?: number | null): Promise<CustomerInfo | null> {
    const u = (await db.query(
        `SELECT id, email, first_name, last_name, kyc_status, business_type, company_name, company_number, companies_house_number
           FROM "user" WHERE id = $1 AND deleted_at IS NULL`, [userId])).rows[0];
    if (!u) return null;
    const b = businessId
        ? (await db.query(`SELECT company_name, trading_name, companies_house_number FROM business WHERE id = $1 AND user_id = $2`, [businessId, userId])).rows[0]
        : null;
    const owners = (await db.query(
        `SELECT full_name, role, status, requires_verification FROM business_owner WHERE user_id = $1 ORDER BY id`, [userId])).rows;
    return {
        user_id: Number(u.id), email: u.email, first_name: u.first_name, last_name: u.last_name, kyc_status: u.kyc_status,
        business_type: u.business_type,
        company_name: b?.company_name ?? u.company_name ?? null,
        company_number: b?.companies_house_number ?? u.companies_house_number ?? u.company_number ?? null,
        trading_name: b?.trading_name ?? null,
        owners: owners.map((o: any) => ({ full_name: o.full_name, role: o.role, status: o.status, requires_verification: !!o.requires_verification })),
    };
}

export async function getCheck(db: Queryable, id: number) {
    return (await db.query(`SELECT * FROM company_check WHERE id = $1`, [id])).rows[0] ?? null;
}

export async function refreshSnapshot(db: Queryable, client: ChClient, check: any): Promise<{ snapshot: Snapshot; changedHash: boolean }> {
    const snapshot = await fetchSnapshot(client, check.company_number);
    const hash = snapshotHash(snapshot);
    await db.query(
        `UPDATE company_check SET snapshot = $2, snapshot_hash = $3, fetched_at = NOW(), fetch_error = NULL,
                company_name = COALESCE($4, company_name), updated_at = NOW() WHERE id = $1`,
        [check.id, JSON.stringify(snapshot), hash, snapshot.profile?.company_name ?? null]);
    return { snapshot, changedHash: !!check.snapshot_hash && check.snapshot_hash !== hash };
}

export async function detail(db: Queryable, id: number) {
    const check = await getCheck(db, id);
    if (!check) return null;
    const customer = await loadCustomer(db, Number(check.user_id), check.business_id);
    const [entries, evidence, reports, alerts, decidedBy] = await Promise.all([
        db.query(`SELECT * FROM company_check_entry WHERE check_id = $1 ORDER BY created_at, id`, [id]),
        db.query(`SELECT id, kind, description, filename, mime, size_bytes, sha256, admin_id, created_at FROM company_check_evidence WHERE check_id = $1 ORDER BY id`, [id]),
        db.query(`SELECT id, created_by, reason, status, sha256, created_at FROM company_check_report WHERE check_id = $1 ORDER BY id DESC`, [id]),
        db.query(`SELECT * FROM company_check_alert WHERE check_id = $1 ORDER BY detected_at DESC LIMIT 50`, [id]),
        check.decided_by ? db.query(`SELECT email FROM "user" WHERE id = $1`, [check.decided_by]) : Promise.resolve({ rows: [] }),
    ]);
    const analysis = check.snapshot && customer ? analyse(check.snapshot, customer) : { flags: [], comparison: [] };
    return { check, customer, entries: entries.rows, evidence: evidence.rows, reports: reports.rows, alerts: alerts.rows,
        decided_by_email: decidedBy.rows[0]?.email ?? null, analysis };
}

export async function saveReport(db: Queryable, id: number, admin: { id: number; email: string | null }, reason: string) {
    const d = await detail(db, id);
    if (!d || !d.customer) throw new Error('check_not_found');
    const content = buildReportContent({ check: d.check, customer: d.customer, analysis: d.analysis, entries: d.entries, evidence: d.evidence, generatedBy: admin, reason });
    const sha = contentHash(content);
    const pdf = await renderReportPdf(content, sha);
    const r = await db.query(
        `INSERT INTO company_check_report (check_id, created_by, reason, status, content, sha256, pdf) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
        [id, admin.id, reason, d.check.status, JSON.stringify(content), sha, pdf]);
    return { id: Number(r.rows[0].id), created_at: r.rows[0].created_at, sha256: sha };
}

/**
 * The company numbers a customer has given us (account and active businesses). Each one needs a
 * satisfactory company check before full service (reg 30A: register extract before the relationship).
 */
export async function requiredCompanyNumbers(db: Queryable, userId: number): Promise<string[]> {
    const u = (await db.query(`SELECT company_number, companies_house_number FROM "user" WHERE id = $1`, [userId])).rows[0];
    const b = (await db.query(`SELECT companies_house_number FROM business WHERE user_id = $1 AND COALESCE(status, 'active') = 'active'`, [userId])).rows;
    const all = [u?.companies_house_number, u?.company_number, ...b.map((r: any) => r.companies_house_number)]
        .map(normaliseCompanyNumber).filter((x): x is string => !!x);
    return [...new Set(all)];
}

export async function companyAccessState(db: Queryable, userId: number) {
    const numbers = await requiredCompanyNumbers(db, userId);
    if (!numbers.length) return { required: 0, satisfactory: 0, investigating: 0 };
    // Fail closed: until the company_check table exists, no company can count as checked.
    const t = (await db.query(`SELECT to_regclass('public.company_check') IS NOT NULL AS ok`)).rows[0];
    if (!t?.ok) return { required: numbers.length, satisfactory: 0, investigating: 0 };
    const r = (await db.query(`SELECT company_number, status FROM company_check WHERE user_id = $1 AND company_number = ANY($2)`, [userId, numbers])).rows;
    return {
        required: numbers.length,
        satisfactory: r.filter((x: any) => x.status === 'satisfactory').length,
        investigating: r.filter((x: any) => x.status === 'further_investigation').length,
    };
}
