// Company checks end to end: real test database, fake Companies House (fictional data only).
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { setChClientFactory } from '../../server/routes/admin-company-checks';
import { getAccess, getAccessBulk } from '../../server/services/access';
import { runMonitoringOnce } from '../../server/services/companyChecks/monitor';
import { ensureAllChecks, refreshPending } from '../../server/services/companyChecks/automation';
import { fakeChClient, fakeCompany, defaultPscs, declaration } from '../helpers/fakeCompaniesHouse';

const CUSTOMER = 30401;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');

describe('company checks', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;
    const customerToken = `Bearer ${makeUserToken({ id: CUSTOMER, email: 'company-check@example.com' })}`;
    let chState: any = {};
    let checkId = 0;

    beforeAll(async () => {
        process.env.COMPANIES_HOUSE_API_KEY = 'test-key-not-real';
        setChClientFactory(() => fakeChClient(chState));
        const now = Date.now();
        await getPool().query(
            `INSERT INTO "user" (id, email, password, first_name, last_name, company_name, company_number, business_type, is_admin, role, status, kyc_status, is_sole_controller, created_at, updated_at)
             VALUES ($1, 'company-check@example.com', 'x', 'Test', 'User', 'Example Trading Limited', '12345678', 'limited_company', false, 'user', 'active', 'approved', true, $2, $2)
             ON CONFLICT (id) DO NOTHING`, [CUSTOMER, now]);
    });

    const post = (path: string, body: object = {}) => request(app).post(`/api/admin/company-checks${path}`).set('Authorization', admin).send(body);
    const get = (path: string) => request(app).get(`/api/admin/company-checks${path}`).set('Authorization', admin);
    const resolve = (id: number, body: object) => post(`/${checkId}/entries/${id}/resolve`, body);

    it('is for administrators only', async () => {
        expect((await request(app).get('/api/admin/company-checks')).status).toBe(401);
        expect([401, 403]).toContain((await request(app).get('/api/admin/company-checks').set('Authorization', customerToken)).status);
        expect([401, 403]).toContain((await request(app).post(`/api/admin/users/${CUSTOMER}/identity`).set('Authorization', customerToken).send({})).status);
    });

    it('a customer with a company number gets a check automatically, waiting for retrieval', async () => {
        expect(await ensureAllChecks(getPool() as any)).toBeGreaterThanOrEqual(1); // the hourly job
        const r = await get('?view=all');
        expect(r.status).toBe(200);
        const item = r.body.data.items.find((i: any) => i.user_id === CUSTOMER);
        expect(item).toBeTruthy();
        checkId = item.id;
        expect(item.next.key).toBe('retrieve');
        const audit = await getPool().query(`SELECT 1 FROM audit_log WHERE entity = 'company_check' AND entity_id = $1 AND action = 'company_check_link'`, [String(checkId)]);
        expect(audit.rows.length).toBe(1);
    });

    it('automation retrieves it; then the customer is asked for their company declaration', async () => {
        const r = await refreshPending(getPool() as any, fakeChClient({}));
        expect(r.refreshed).toBeGreaterThanOrEqual(1);
        const d = (await get(`/${checkId}`)).body.data;
        expect(d.next.key).toBe('await_customer');
        expect(d.analysis.automated.find((a: any) => a.id === 'declaration').status).toBe('missing');
        expect(d.analysis.discrepancies).toEqual([]); // missing information is not a discrepancy
        const access = await getAccess(CUSTOMER);
        expect(access!.missing).toContain('company_checks_pending');
        expect(access!.company.declarationNeeded).toBe(true);
    });

    it('the customer submits a declaration once; people needing identity checks are invited', async () => {
        const g = await request(app).get('/api/account/company-declaration').set('Authorization', customerToken);
        expect(g.body.data).toMatchObject({ required: true, company_number: '12345678', editable: true });
        const bad = await request(app).post('/api/account/company-declaration').set('Authorization', customerToken).send(declaration({ people: [] }));
        expect(bad.status).toBe(400);
        const wrongName = await request(app).post('/api/account/company-declaration').set('Authorization', customerToken)
            .send(declaration({ people: [{ ...declaration().people[0], full_name: 'Someone Else' }] }));
        expect(wrongName.status).toBe(400);
        const body = declaration({ people: [declaration().people[0], { full_name: 'New Director', email: 'new.director@example.com', is_account_holder: false, is_director: true, is_beneficial_owner: false, other_control: false, country_of_residence: 'England' }] });
        const ok = await request(app).post('/api/account/company-declaration').set('Authorization', customerToken).send(body);
        expect(ok.status).toBe(201);
        expect(ok.body.data.owners_invited).toEqual(['New Director']);
        expect((await request(app).post('/api/account/company-declaration').set('Authorization', customerToken).send(body)).status).toBe(409);
        const owners = await getPool().query(`SELECT full_name, requires_verification, status FROM business_owner WHERE user_id = $1`, [CUSTOMER]);
        expect(owners.rows).toEqual([{ full_name: 'New Director', requires_verification: true, status: 'not_started' }]);
    });

    it('the declared director who is not on the register is recorded as an "other" discrepancy automatically', async () => {
        const d = (await get(`/${checkId}`)).body.data;
        const disc = d.entries.filter((e: any) => e.kind === 'discrepancy');
        expect(disc).toHaveLength(1);
        expect(disc[0]).toMatchObject({ source: 'system', category: 'other', detected_key: 'director_not_registered:new director' });
        expect(d.next.key).toBe('resolve_discrepancies');
        expect(Array.isArray((await get(`/${checkId}`)).body.data.shared_with)).toBe(true);
        expect(d.analysis.automated.find((a: any) => a.id === 'screening').status).toBe('not_available');
        expect(d.analysis.automated.find((a: any) => a.id === 'individual_identity').status).toBe('missing');
    });

    it('only beneficial-ownership discrepancies can be reported to Companies House', async () => {
        const sys = (await get(`/${checkId}`)).body.data.entries.find((e: any) => e.source === 'system');
        expect((await resolve(sys.id, { resolution: 'x', materiality: 'material', reference: 'R1' })).body.error).toBe('not_reportable');
        expect((await resolve(sys.id, { resolution: 'Appointed last week; filing pending at Companies House.' })).status).toBe(200);

        const e = await post(`/${checkId}/entries`, { kind: 'discrepancy', category: 'beneficial_ownership', field: 'PSC', chValue: 'Test User 100%', customerValue: 'Test User 60%, partner 40%', body: 'Customer told us a partner holds 40%.' });
        expect(e.status).toBe(201);
        expect((await resolve(e.body.data.id, { resolution: 'Explained' })).body.error).toBe('materiality_required');
        expect((await resolve(e.body.data.id, { resolution: 'Explained', materiality: 'material' })).body.error).toBe('reference_required');
        expect((await resolve(e.body.data.id, { resolution: 'short', materiality: 'not_material' })).body.error).toBe('reason_required');
        expect((await resolve(e.body.data.id, { resolution: 'Reported; partner verified separately', materiality: 'material', reference: 'DR-TEST-1' })).status).toBe(200);
        const row = (await getPool().query(`SELECT materiality, reported_to_ch, report_reference FROM company_check_entry WHERE id = $1`, [e.body.data.id])).rows[0];
        expect(row).toEqual({ materiality: 'material', reported_to_ch: true, report_reference: 'DR-TEST-1' });
    });

    it('completing the review needs only the judgements and a risk rating', async () => {
        const first = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(first.status).toBe(409);
        expect(first.body.data.blockers.join(' ')).toMatch(/judgement is needed/);
        expect(first.body.data.blockers.join(' ')).toMatch(/risk rating/);
        expect((await post(`/${checkId}/judgement`, { item: 'beneficial_owners', done: true, note: 'short' })).status).toBe(200);
        expect((await post(`/${checkId}/judgement`, { item: 'activity', done: true })).status).toBe(200);
        expect((await post(`/${checkId}/judgement`, { item: 'register_extract', done: true })).status).toBe(400); // automated: not tickable
        expect((await post(`/${checkId}/risk`, { rating: 'extreme', reason: 'x' })).status).toBe(400);
        expect((await post(`/${checkId}/risk`, { rating: 'low', reason: 'UK company, simple ownership, low mail volume' })).status).toBe(200);
        const second = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(second.body.message).toMatch(/evidence or a note/);
        expect((await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: 'x', filename: 'a.exe', dataBase64: Buffer.from('MZ..').toString('base64') })).status).toBe(415);
        expect((await post(`/${checkId}/evidence`, { kind: 'beneficial_ownership', description: 'Share register', filename: 'register.pdf', dataBase64: PDF })).status).toBe(201);
    });

    it('a completed review saves a dated report, turns monitoring on, and never approves the customer by itself', async () => {
        const r = await post(`/${checkId}/decision`, { status: 'satisfactory' });
        expect(r.status).toBe(200);
        expect(r.body.data.report.sha256).toMatch(/^[0-9a-f]{64}$/);
        const pdf = await get(`/${checkId}/reports/${r.body.data.report.id}`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
        const d = (await get(`/${checkId}`)).body.data;
        expect(d.check).toMatchObject({ status: 'satisfactory', monitoring: true, risk_rating: 'low' });
        expect(d.next.key).toBe('none');
        const access = await getAccess(CUSTOMER);
        expect(access!.missing).not.toContain('company_checks_pending');
        expect(access!.missing).toContain('owners_required'); // the declared director still has to verify
        expect(access!.level).not.toBe('full');
        expect((await post(`/${checkId}/judgement`, { item: 'activity', done: false })).status).toBe(409);
    });

    it('administrators can record an identity result established by document review, permanently', async () => {
        const owner = (await getPool().query(`SELECT id FROM business_owner WHERE user_id = $1`, [CUSTOMER])).rows[0];
        const url = `/api/admin/users/${CUSTOMER}/identity`;
        expect((await request(app).post(url).set('Authorization', admin).send({ subject: 'owner', ownerId: owner.id, outcome: 'verified', notes: 'short' })).status).toBe(400);
        expect((await request(app).post(url).set('Authorization', admin).send({ subject: 'owner', ownerId: owner.id, outcome: 'verified', notes: 'Passport and utility bill checked on video call' })).body.error).toBe('reference_required');
        const ok = await request(app).post(url).set('Authorization', admin).send({ subject: 'owner', ownerId: owner.id, outcome: 'verified', reference: 'DOC-2026-001', notes: 'Passport and utility bill checked on video call' });
        expect(ok.status).toBe(201);
        const g = await request(app).get(url).set('Authorization', admin);
        expect(g.body.data.owners[0].status).toBe('verified');
        expect(g.body.data.records[0]).toMatchObject({ subject: 'owner', outcome: 'verified', method: 'manual_documents', reference: 'DOC-2026-001' });
        expect(g.body.data.provider.connected).toBe(false);
        await expect(getPool().query(`UPDATE identity_check SET outcome = 'rejected' WHERE user_id = $1`, [CUSTOMER])).rejects.toThrow(/cannot be changed/);
        expect((await getAccess(CUSTOMER))!.level).toBe('onboarding'); // still needs payment
    });

    it('monitoring raises an alert on change, and a new undeclared PSC re-opens the review', async () => {
        await getPool().query(`UPDATE company_check SET last_monitored_at = NULL WHERE id = $1`, [checkId]);
        expect((await runMonitoringOnce(getPool() as any, fakeChClient({}))).alerts).toBe(0);
        await getPool().query(`UPDATE company_check SET last_monitored_at = NULL WHERE id = $1`, [checkId]);
        const r = await runMonitoringOnce(getPool() as any, fakeChClient({ pscs: [...defaultPscs(), { name: 'Mr New Investor', kind: 'individual-person-with-significant-control', natures_of_control: ['ownership-of-shares-25-to-50-percent'], country_of_residence: 'England' }] }));
        expect(r).toMatchObject({ alerts: 1, errors: 0 });
        const d = (await get(`/${checkId}`)).body.data;
        expect(d.check.status).toBe('further_investigation');
        expect(d.next.key).toBe('review_alert');
        expect(d.entries.some((e: any) => e.detected_key === 'psc_not_declared:new investor' && e.category === 'beneficial_ownership')).toBe(true);
        expect((await getAccess(CUSTOMER))!.missing).toContain('company_checks_pending');
        const alert = d.alerts[0];
        expect((await post(`/${checkId}/alerts/${alert.id}/ack`, {})).status).toBe(400);
        expect((await post(`/${checkId}/alerts/${alert.id}/ack`, { note: 'New shareholder; asked the customer to update their declaration' })).status).toBe(200);
        expect((await get('/summary')).body.data).toMatchObject({ open_alerts: 0, investigating: 1 });
    });

    it('a declaration returned to the customer can be resubmitted; history is kept', async () => {
        expect((await post(`/${checkId}/declaration/return`, { reason: 'x' })).status).toBe(400);
        expect((await post(`/${checkId}/declaration/return`, { reason: 'Please add Mr New Investor as a beneficial owner' })).status).toBe(200);
        const g = await request(app).get('/api/account/company-declaration').set('Authorization', customerToken);
        expect(g.body.data).toMatchObject({ editable: true });
        expect(g.body.data.declaration.returned_reason).toMatch(/New Investor/);
        expect((await getAccess(CUSTOMER))!.company.declarationNeeded).toBe(true); // next step is payment first: this test customer has not paid
        const again = await request(app).post('/api/account/company-declaration').set('Authorization', customerToken).send(declaration({ people: [
            { ...declaration().people[0], ownership_percent: 60, voting_percent: 60 },
            { full_name: 'New Investor', email: 'investor@example.com', is_account_holder: false, is_director: false, is_beneficial_owner: true, ownership_percent: 40, voting_percent: null, other_control: false, country_of_residence: 'England' },
            { full_name: 'New Director', email: 'new.director@example.com', is_account_holder: false, is_director: true, is_beneficial_owner: false, other_control: false, country_of_residence: 'England' },
        ] }));
        expect(again.status).toBe(201);
        expect((await getPool().query(`SELECT COUNT(*)::int AS n FROM company_declaration WHERE user_id = $1`, [CUSTOMER])).rows[0].n).toBe(2);
    });

    it('records cannot be altered or deleted, and the customer cannot be permanently deleted', async () => {
        await expect(getPool().query(`UPDATE company_check_report SET status = 'x' WHERE check_id = $1`, [checkId])).rejects.toThrow(/cannot be changed/);
        await expect(getPool().query(`DELETE FROM company_check_evidence WHERE check_id = $1`, [checkId])).rejects.toThrow(/cannot be deleted/);
        await expect(getPool().query(`UPDATE company_check_entry SET body = 'rewritten' WHERE check_id = $1`, [checkId])).rejects.toThrow(/only an unresolved entry/);
        const del = await request(app).delete(`/api/admin/users/${CUSTOMER}?permanent=true`).set('Authorization', admin);
        expect(del.status).toBe(409);
        expect(del.body.error).toBe('records_must_be_retained');
    });

    it('Companies House outages are reported without changing anything', async () => {
        chState = { rateLimited: true };
        const r = await post(`/${checkId}/refresh`);
        expect(r.status).toBe(429);
        expect(r.body.error).toBe('companies_house_rate_limited');
        chState = {};
    });

    it('the queue puts the investigation first with its next action', async () => {
        const r = await get('?view=action');
        expect(r.body.data.counts.action).toBeGreaterThanOrEqual(1);
        expect(r.body.data.items[0]).toMatchObject({ id: checkId, next: { key: 'investigate' } });
    });

    it('every administrator action and every automated step was audited', async () => {
        const admins = (await getPool().query(`SELECT action FROM admin_audit WHERE target_type = 'company_check' AND target_id = $1`, [checkId])).rows.map(r => r.action);
        for (const a of ['company_check_item_done', 'company_check_risk_rated', 'company_check_evidence_added', 'company_check_discrepancy_added', 'company_check_discrepancy_resolved',
            'company_check_decision', 'company_check_report_saved', 'company_check_alert_acknowledged', 'company_check_declaration_returned', 'company_check_report_viewed']) expect(admins).toContain(a);
        const system = (await getPool().query(`SELECT action FROM audit_log WHERE entity = 'company_check' AND entity_id = $1`, [String(checkId)])).rows.map(r => r.action);
        for (const a of ['company_check_link', 'company_check_refresh', 'company_check_discrepancy_detected', 'company_check_declaration_received', 'company_check_alert_raised', 'company_check_reopened']) expect(system).toContain(a);
        expect((await getPool().query(`SELECT 1 FROM admin_audit WHERE action = 'identity_result_recorded' AND target_id = $1`, [CUSTOMER])).rows.length).toBe(1);
    });

    it('the admin list\'s bulk access decision matches the per-customer one for every account', async () => {
        const ids = (await getPool().query(`SELECT id FROM "user" ORDER BY id`)).rows.map((r: any) => Number(r.id));
        const now = Date.now();
        const bulk = await getAccessBulk(ids, getPool() as any, now);
        for (const id of ids) expect(bulk.get(id)).toEqual(await getAccess(id, getPool() as any, now));
    });
});
