/** Database access for company checks. All writes that matter for compliance are audited. */
import { analyse, nextAction, satisfactoryBlockers, type CustomerInfo } from './analysis';
import { normaliseCompanyNumber, type ChClient } from './chClient';
import { fetchSnapshot, snapshotHash, type Snapshot } from './snapshot';
import { buildReportContent, contentHash, renderReportPdf } from './report';
import { latestDeclaration } from './declaration';

export type Queryable = { query: (sql: string, args?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> };
export const SYSTEM = 0; // admin_id / resolved_by for actions taken by the system

export async function audit(db: Queryable, adminId: number | null, action: string, checkId: number | null, details: Record<string, unknown>) {
    if (adminId === null || adminId === SYSTEM) {
        // Done by the system (automation, monitoring), not by an administrator.
        await db.query(`INSERT INTO audit_log (entity, entity_id, action, meta, created_at) VALUES ('company_check', $1, $2, $3, NOW())`,
            [String(checkId), action, JSON.stringify(details)]);
        return;
    }
    await db.query(
        `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, $2, 'company_check', $3, $4, NOW())`,
        [adminId, action, checkId, JSON.stringify(details)]);
}

export async function loadCustomer(db: Queryable, userId: number, businessId?: number | null, companyNumber?: string | null): Promise<CustomerInfo | null> {
    const u = (await db.query(
        `SELECT id, email, first_name, last_name, kyc_status, business_type, company_name, company_number, companies_house_number
           FROM "user" WHERE id = $1 AND deleted_at IS NULL`, [userId])).rows[0];
    if (!u) return null;
    const b = businessId
        ? (await db.query(`SELECT company_name, trading_name, companies_house_number FROM business WHERE id = $1 AND user_id = $2`, [businessId, userId])).rows[0]
        : null;
    const owners = (await db.query(
        `SELECT id, full_name, email, role, status, requires_verification FROM business_owner WHERE user_id = $1 ORDER BY id`, [userId])).rows;
    const number = normaliseCompanyNumber(companyNumber ?? b?.companies_house_number ?? u.companies_house_number ?? u.company_number);
    const decl = number ? await latestDeclaration(db, userId, number) : null;
    return {
        user_id: Number(u.id), email: u.email, first_name: u.first_name, last_name: u.last_name, kyc_status: u.kyc_status,
        business_type: u.business_type,
        company_name: b?.company_name ?? u.company_name ?? null,
        company_number: b?.companies_house_number ?? u.companies_house_number ?? u.company_number ?? null,
        trading_name: b?.trading_name ?? null,
        owners: owners.map((o: any) => ({ id: Number(o.id), full_name: o.full_name, email: o.email, role: o.role, status: o.status, requires_verification: !!o.requires_verification })),
        declaration: decl ? { data: decl.data, submitted_at: decl.submitted_at, returned_at: decl.returned_at, returned_reason: decl.returned_reason } : null,
    };
}

export async function getCheck(db: Queryable, id: number) {
    return (await db.query(`SELECT * FROM company_check WHERE id = $1`, [id])).rows[0] ?? null;
}

/** Find or create the check for a customer's company (no Companies House call). */
export async function ensureCheck(db: Queryable, userId: number, companyNumber: string, createdBy: number | null, businessId: number | null = null) {
    const ins = await db.query(
        `INSERT INTO company_check (user_id, business_id, company_number, created_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, company_number) DO NOTHING RETURNING *`, [userId, businessId, companyNumber, createdBy]);
    if (ins.rows[0]) {
        await audit(db, createdBy, 'company_check_link', Number(ins.rows[0].id), { user_id: userId, company_number: companyNumber, business_id: businessId, automatic: !createdBy });
        return { check: ins.rows[0], created: true };
    }
    const r = await db.query(`SELECT * FROM company_check WHERE user_id = $1 AND company_number = $2`, [userId, companyNumber]);
    return { check: r.rows[0], created: false };
}

export async function refreshSnapshot(db: Queryable, client: ChClient, check: any): Promise<{ snapshot: Snapshot; changedHash: boolean }> {
    const snapshot = await fetchSnapshot(client, check.company_number);
    const hash = snapshotHash(snapshot);
    await db.query(
        `UPDATE company_check SET snapshot = $2, snapshot_hash = $3, fetched_at = NOW(), fetch_error = NULL,
                company_name = COALESCE($4, company_name), updated_at = NOW() WHERE id = $1`,
        [check.id, JSON.stringify(snapshot), hash, snapshot.profile?.company_name ?? null]);
    await syncDiscrepancies(db, Number(check.id));
    return { snapshot, changedHash: !!check.snapshot_hash && check.snapshot_hash !== hash };
}

/**
 * Records every discrepancy the analysis detects (once), and closes system-recorded ones that are no
 * longer detected (the register or the declaration now agree). An administrator still decides
 * materiality and reporting for any that remain.
 */
export async function syncDiscrepancies(db: Queryable, checkId: number) {
    const check = await getCheck(db, checkId);
    if (!check?.snapshot) return { added: 0, closed: 0 };
    const customer = await loadCustomer(db, Number(check.user_id), check.business_id, check.company_number);
    if (!customer) return { added: 0, closed: 0 };
    const a = analyse(check.snapshot, customer);
    const recorded = (await db.query(`SELECT id, detected_key, category, resolved_at, resolved_by FROM company_check_entry WHERE check_id = $1 AND detected_key IS NOT NULL`, [checkId])).rows;
    const open = recorded.filter((e: any) => !e.resolved_at);
    // Handled = still open, or resolved by an administrator. One the system cleared is raised again if it comes back.
    const openKeys = new Set(recorded.filter((e: any) => !e.resolved_at || Number(e.resolved_by) !== SYSTEM).map((e: any) => e.detected_key));
    let added = 0, closed = 0;
    for (const d of a.discrepancies) {
        if (openKeys.has(d.key)) continue;
        const r = await db.query(
            `INSERT INTO company_check_entry (check_id, admin_id, kind, field, ch_value, customer_value, body, category, source, detected_key)
             VALUES ($1, 0, 'discrepancy', $2, $3, $4, $5, $6, 'system', $7) ON CONFLICT DO NOTHING RETURNING id`,
            [checkId, d.field, d.register, d.declared, d.text, d.category, d.key]);
        if (r.rows.length) { added++; await audit(db, SYSTEM, 'company_check_discrepancy_detected', checkId, { entry_id: Number(r.rows[0].id), key: d.key, category: d.category }); }
    }
    const detected = new Set(a.discrepancies.map(d => d.key));
    // Only when the comparison could run: a missing declaration hides discrepancies, it does not resolve them.
    const comparable = !!customer.declaration && !customer.declaration.returned_at;
    for (const e of open) {
        if (detected.has(e.detected_key)) continue;
        if (!comparable && !String(e.detected_key).startsWith('company:')) continue;
        await db.query(
            `UPDATE company_check_entry SET resolution = $2, materiality = $3, resolved_by = 0, resolved_at = NOW() WHERE id = $1 AND resolved_at IS NULL`,
            [e.id, `No longer detected on ${new Date().toISOString().slice(0, 10)}: the register and the customer's information now agree.`, e.category === 'beneficial_ownership' ? null : 'not_applicable']);
        closed++;
        await audit(db, SYSTEM, 'company_check_discrepancy_cleared', checkId, { entry_id: Number(e.id), key: e.detected_key });
    }
    if (added) {
        // A new discrepancy on an approved company re-opens it: service pauses until reviewed.
        const r = await db.query(`UPDATE company_check SET status = 'further_investigation', updated_at = NOW() WHERE id = $1 AND status = 'satisfactory' RETURNING id`, [checkId]);
        if (r.rows.length) await audit(db, SYSTEM, 'company_check_reopened', checkId, { reason: 'new discrepancy detected' });
    }
    return { added, closed };
}

/** Everything the review screen and the decision rules need for one check. */
export async function detail(db: Queryable, id: number) {
    const check = await getCheck(db, id);
    if (!check) return null;
    const customer = await loadCustomer(db, Number(check.user_id), check.business_id, check.company_number);
    const [entries, evidence, reports, alerts, decidedBy, identity] = await Promise.all([
        db.query(`SELECT * FROM company_check_entry WHERE check_id = $1 ORDER BY created_at, id`, [id]),
        db.query(`SELECT id, kind, description, filename, mime, size_bytes, sha256, admin_id, created_at FROM company_check_evidence WHERE check_id = $1 ORDER BY id`, [id]),
        db.query(`SELECT id, created_by, reason, status, sha256, created_at FROM company_check_report WHERE check_id = $1 ORDER BY id DESC`, [id]),
        db.query(`SELECT * FROM company_check_alert WHERE check_id = $1 ORDER BY detected_at DESC LIMIT 50`, [id]),
        check.decided_by ? db.query(`SELECT email FROM "user" WHERE id = $1`, [check.decided_by]) : Promise.resolve({ rows: [] }),
        db.query(`SELECT id, subject, owner_id, outcome, method, reference, notes, admin_id, created_at FROM identity_check WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, [check.user_id]).catch(() => ({ rows: [] })),
    ]);
    const analysis = customer ? analyse(check.snapshot ?? null, customer) : { automated: [], discrepancies: [], missing: [], flags: [], comparison: [], attention: 0 };
    const openDisc = entries.rows.filter((e: any) => e.kind === 'discrepancy' && !e.resolved_at);
    const recordedKeys = new Set(entries.rows.filter((e: any) => !e.resolved_at || Number(e.resolved_by) !== SYSTEM).map((e: any) => e.detected_key).filter(Boolean));
    const unrecorded = analysis.discrepancies.filter(d => !recordedKeys.has(d.key)).length;
    const blockers = satisfactoryBlockers({
        checklist: check.checklist || {}, automated: analysis.automated, attention: analysis.attention,
        unrecordedDiscrepancies: unrecorded, unresolvedDiscrepancies: openDisc.length,
        beneficialOwnerEvidence: evidence.rows.filter((e: any) => e.kind === 'beneficial_ownership').length, riskRating: check.risk_rating,
    });
    const next = nextAction({ status: check.status, hasSnapshot: !!check.snapshot, fetchError: check.fetch_error, openAlerts: alerts.rows.filter((a: any) => !a.acknowledged_at).length,
        unresolved: openDisc.length + unrecorded, automated: analysis.automated, blockers });
    return { check, customer, entries: entries.rows, evidence: evidence.rows, reports: reports.rows, alerts: alerts.rows, identity: identity.rows,
        decided_by_email: decidedBy.rows[0]?.email ?? null, analysis, blockers, next };
}

export async function saveReport(db: Queryable, id: number, admin: { id: number; email: string | null }, reason: string) {
    const d = await detail(db, id);
    if (!d || !d.customer) throw new Error('check_not_found');
    const content = buildReportContent({ check: d.check, customer: d.customer, analysis: d.analysis, entries: d.entries, evidence: d.evidence, identity: d.identity, generatedBy: admin, reason });
    const sha = contentHash(content);
    const pdf = await renderReportPdf(content, sha);
    const r = await db.query(
        `INSERT INTO company_check_report (check_id, created_by, reason, status, content, sha256, pdf) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
        [id, admin.id, reason, d.check.status, JSON.stringify(content), sha, pdf]);
    return { id: Number(r.rows[0].id), created_at: r.rows[0].created_at, sha256: sha };
}

/** Company numbers a customer has given us (account and active businesses). */
export async function requiredCompanyNumbers(db: Queryable, userId: number): Promise<string[]> {
    const u = (await db.query(`SELECT company_number, companies_house_number FROM "user" WHERE id = $1`, [userId])).rows[0];
    const b = (await db.query(`SELECT companies_house_number FROM business WHERE user_id = $1 AND COALESCE(status, 'active') = 'active'`, [userId])).rows;
    const all = [u?.companies_house_number, u?.company_number, ...b.map((r: any) => r.companies_house_number)]
        .map(normaliseCompanyNumber).filter((x): x is string => !!x);
    return [...new Set(all)];
}

export async function companyAccessState(db: Queryable, userId: number) {
    const numbers = await requiredCompanyNumbers(db, userId);
    if (!numbers.length) return { required: 0, satisfactory: 0, investigating: 0, declarationNeeded: false };
    // Fail closed: until the company_check table exists, no company can count as checked.
    const t = (await db.query(`SELECT to_regclass('public.company_check') IS NOT NULL AS ok, to_regclass('public.company_declaration') IS NOT NULL AS decl`)).rows[0];
    if (!t?.ok) return { required: numbers.length, satisfactory: 0, investigating: 0, declarationNeeded: false };
    const r = (await db.query(`SELECT company_number, status FROM company_check WHERE user_id = $1 AND company_number = ANY($2)`, [userId, numbers])).rows;
    let declarationNeeded = false;
    if (t.decl) {
        const d = (await db.query(
            `SELECT DISTINCT ON (company_number) company_number, returned_at FROM company_declaration WHERE user_id = $1 AND company_number = ANY($2)
              ORDER BY company_number, submitted_at DESC, id DESC`, [userId, numbers])).rows;
        declarationNeeded = numbers.some(n => { const x = d.find((y: any) => y.company_number === n); return !x || !!x.returned_at; });
    }
    return {
        required: numbers.length,
        satisfactory: r.filter((x: any) => x.status === 'satisfactory').length,
        investigating: r.filter((x: any) => x.status === 'further_investigation').length,
        declarationNeeded,
    };
}
