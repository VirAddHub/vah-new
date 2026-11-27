// Admin Company checks: real test database, fake Companies House (fictional data only).
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { setChClientFactory } from '../../server/routes/admin-company-checks';
import { getAccess } from '../../server/services/access';
import { runMonitoringOnce } from '../../server/services/companyChecks/monitor';
import { CHECKLIST } from '../../server/services/companyChecks/analysis';
import { fakeChClient, fakeCompany } from '../helpers/fakeCompaniesHouse';

const CUSTOMER = 30401;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');

describe('admin company checks', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;
    let chState: any = {};
    let checkId = 0;

    beforeAll(async () => {
        setChClientFactory(() => fakeChClient(chState));
        const now = Date.now();
        await getPool().query(
            `INSERT INTO "user" (id, email, password, first_name, last_name, company_name, company_number, business_type, is_admin, role, status, kyc_status, is_sole_controller, created_at, updated_at)
             VALUES ($1, 'company-check@example.com', 'x', 'Test', 'User', 'Example Trading Limited', '12345678', 'limited_company', false, 'user', 'active', 'approved', true, $2, $2)
             ON CONFLICT (id) DO NOTHING`, [CUSTOMER, now]);
        await getPool().query(
            `INSERT INTO subscription (user_id, status, stripe_subscription_id, paid_through_ms) VALUES ($1, 'active', 'sub_test_cc', $2)`,
            [CUSTOMER, now + 30 * 864e5]).catch(() => { /* columns differ in older schemas: access test below asserts the company reason only */ });
    });

    const post = (path: string, body: object = {}) => request(app).post(`/api/admin/company-checks${path}`).set('Authorization', admin).send(body);
    const get = (path: string) => request(app).get(`/api/admin/company-checks${path}`).set('Authorization', admin);

    it('is for administrators only', async () => {
        expect((await request(app).get('/api/admin/company-checks')).status).toBe(401);
        const user = await request(app).get('/api/admin/company-checks').set('Authorization', `Bearer ${makeUserToken()}`);
        expect([401, 403]).toContain(user.status);
        const userPost = await request(app).post('/api/admin/company-checks').set('Authorization', `Bearer ${makeUserToken()}`).send({ userId: CUSTOMER, companyNumber: '12345678' });
        expect([401, 403]).toContain(userPost.status);
    });

    it('a customer with a company number is held until the company check is satisfactory', async () => {
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).toContain('company_checks_pending');
        expect(a!.company).toEqual({ required: 1, satisfactory: 0, investigating: 0 });
    });

    it('searches Companies House by name or number', async () => {
        const r = await get('/search?q=12345678');
        expect(r.status).toBe(200);
        expect(r.body.data[0].company_number).toBe('12345678');
        expect((await get('/search?q=a')).status).toBe(400);
    });

    it('validates the link request', async () => {
        expect((await post('', { userId: CUSTOMER, companyNumber: '12-34' })).status).toBe(400);
        expect((await post('', { userId: 999999, companyNumber: '12345678' })).status).toBe(404);
    });

    it('links a company to the customer and stores the register extract', async () => {
        const r = await post('', { userId: CUSTOMER, companyNumber: '12345678' });
        expect(r.status).toBe(201);
        checkId = r.body.data.id;
        const d = await get(`/${checkId}`);
        expect(d.status).toBe(200);
        expect(d.body.data.check.snapshot.profile.company_name).toBe('EXAMPLE TRADING LTD');
        expect(d.body.data.check.snapshot.officers[0].disqualification.searched).toBe(true);
        expect(d.body.data.analysis.comparison.find((c: any) => c.field === 'Company name').result).toBe('match');
        expect(d.body.data.satisfactory_blockers.length).toBeGreaterThan(0);
        expect((await post('', { userId: CUSTOMER, companyNumber: '12345678' })).status).toBe(409);
        const audit = await getPool().query(`SELECT action FROM admin_audit WHERE target_type = 'company_check' AND target_id = $1`, [checkId]);
        expect(audit.rows.map(r => r.action)).toContain('company_check_link');
    });

    it('refuses a satisfactory decision until the checklist is complete', async () => {
        const r = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(r.status).toBe(409);
        expect(r.body.data.blockers.join(' ')).toMatch(/Checklist items outstanding/);
    });

    it('needs evidence or a note for beneficial ownership', async () => {
        for (const item of CHECKLIST) expect((await post(`/${checkId}/checklist`, { item: item.id, done: true })).status).toBe(200);
        const r = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(r.status).toBe(409);
        expect(r.body.message).toMatch(/Beneficial ownership needs supporting evidence/);
    });

    it('accepts PDF evidence and rejects other files', async () => {
        expect((await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: 'x', filename: 'a.exe', dataBase64: Buffer.from('MZ....').toString('base64') })).status).toBe(415);
        expect((await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: '', filename: 'a.pdf', dataBase64: PDF })).status).toBe(400);
        expect((await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: 'x', filename: 'a.pdf', dataBase64: 'A'.repeat(4.5 * 1024 * 1024) })).status).toBe(413);
        const ok = await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: 'Share register', filename: '../../share register.pdf', dataBase64: PDF });
        expect(ok.status).toBe(201);
        const file = await get(`/${checkId}/evidence/${ok.body.data.id}`);
        expect(file.status).toBe(200);
        expect(file.headers['content-type']).toBe('application/pdf');
        expect(file.headers['content-disposition']).toBe('attachment; filename="share register.pdf"');
    });

    it('a material discrepancy needs a Companies House report reference before it can be resolved', async () => {
        const e = await post(`/${checkId}/entries`, { kind: 'discrepancy', field: 'PSC', chValue: 'Test User', customerValue: 'Test User and partner', material: true, body: 'Customer says a second owner holds 30%.' });
        expect(e.status).toBe(201);
        expect((await post(`/${checkId}/decision`, { status: 'satisfactory' })).body.message).toMatch(/discrepanc/);
        expect((await post(`/${checkId}/entries/${e.body.data.id}/resolve`, { resolution: 'Explained' })).status).toBe(400);
        expect((await post(`/${checkId}/entries/${e.body.data.id}/resolve`, { resolution: 'Reported', reportedToCh: true })).status).toBe(400);
        expect((await post(`/${checkId}/entries/${e.body.data.id}/resolve`, { resolution: 'Reported; second owner verified', reportedToCh: true, reference: 'DR-TEST-1' })).status).toBe(200);
        expect((await post(`/${checkId}/entries/${e.body.data.id}/resolve`, { resolution: 'again', reportedToCh: true, reference: 'x' })).status).toBe(409);
    });

    it('records a satisfactory decision with a dated report, starts monitoring and releases the company requirement', async () => {
        const r = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(r.status).toBe(200);
        expect(r.body.data.report.sha256).toMatch(/^[0-9a-f]{64}$/);
        const pdf = await get(`/${checkId}/reports/${r.body.data.report.id}`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
        expect(pdf.status).toBe(200);
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
        const d = await get(`/${checkId}`);
        expect(d.body.data.check.status).toBe('satisfactory');
        expect(d.body.data.check.monitoring).toBe(true);
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).not.toContain('company_checks_pending');
        expect((await post(`/${checkId}/checklist`, { item: 'psc', done: false })).status).toBe(409);
    });

    it('reports, evidence and entries cannot be altered or deleted', async () => {
        await expect(getPool().query(`UPDATE company_check_report SET status = 'x' WHERE check_id = $1`, [checkId])).rejects.toThrow(/cannot be changed/);
        await expect(getPool().query(`DELETE FROM company_check_report WHERE check_id = $1`, [checkId])).rejects.toThrow(/cannot be deleted/);
        await expect(getPool().query(`DELETE FROM company_check_evidence WHERE check_id = $1`, [checkId])).rejects.toThrow(/cannot be deleted/);
        await expect(getPool().query(`UPDATE company_check_entry SET body = 'rewritten' WHERE check_id = $1`, [checkId])).rejects.toThrow(/only an unresolved entry/);
    });

    it('monitoring raises an alert when the register changes, and does nothing when it does not', async () => {
        await getPool().query(`UPDATE company_check SET last_monitored_at = NULL WHERE id = $1`, [checkId]);
        expect((await runMonitoringOnce(getPool() as any, fakeChClient({}))).alerts).toBe(0);
        await getPool().query(`UPDATE company_check SET last_monitored_at = NULL WHERE id = $1`, [checkId]);
        const r = await runMonitoringOnce(getPool() as any, fakeChClient({ company: fakeCompany({ company_status: 'liquidation', has_insolvency_history: true }) }));
        expect(r).toMatchObject({ alerts: 1, errors: 0 });
        expect((await getPool().query(`SELECT 1 FROM audit_log WHERE entity = 'company_check' AND entity_id = $1 AND action = 'company_check_alert_raised'`, [String(checkId)])).rows.length).toBe(1);
        const s = await get('/summary');
        expect(s.body.data.open_alerts).toBe(1);
        const alert = (await get(`/${checkId}`)).body.data.alerts[0];
        expect(alert.changes.map((c: any) => c.field)).toEqual(expect.arrayContaining(['company_status', 'insolvency']));
        expect((await post(`/${checkId}/alerts/${alert.id}/ack`, {})).status).toBe(400);
        expect((await post(`/${checkId}/alerts/${alert.id}/ack`, { note: 'Reviewed; moving to investigation' })).status).toBe(200);
        expect((await post(`/${checkId}/alerts/${alert.id}/ack`, { note: 'again' })).status).toBe(404);
    });

    it('moving to further investigation pauses full service again', async () => {
        expect((await post(`/${checkId}/decision`, { status: 'further_investigation' })).status).toBe(400);
        expect((await post(`/${checkId}/decision`, { status: 'further_investigation', reason: 'Company entered liquidation' })).status).toBe(200);
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).toContain('company_checks_pending');
        expect(a!.company.investigating).toBe(1);
        const reports = (await get(`/${checkId}`)).body.data.reports;
        expect(reports.length).toBe(2);
    });

    it('Companies House outages and limits are reported without changing anything', async () => {
        chState = { rateLimited: true };
        const r = await post(`/${checkId}/refresh`);
        expect(r.status).toBe(429);
        expect(r.body.error).toBe('companies_house_rate_limited');
        chState = {};
    });

    it('a customer with company check records cannot be permanently deleted', async () => {
        const r = await request(app).delete(`/api/admin/users/${CUSTOMER}?permanent=true`).set('Authorization', admin).send({ permanent: true, reason: 'test' });
        expect(r.status).toBe(409);
        expect(r.body.error).toBe('records_must_be_retained');
        expect((await getPool().query(`SELECT 1 FROM "user" WHERE id = $1`, [CUSTOMER])).rows.length).toBe(1);
    });

    it('every change was audited', async () => {
        const rows = (await getPool().query(`SELECT action FROM admin_audit WHERE target_type = 'company_check' AND target_id = $1`, [checkId])).rows.map(r => r.action);
        for (const a of ['company_check_link', 'company_check_item_done', 'company_check_evidence_added', 'company_check_discrepancy_added', 'company_check_discrepancy_resolved',
            'company_check_decision', 'company_check_report_saved', 'company_check_alert_acknowledged', 'company_check_report_viewed']) {
            expect(rows).toContain(a);
        }
    });
});
