// Pre-incorporation: a customer forming a company that does not exist yet. Real test database,
// fake Companies House (fictional data only).
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { setChClientFactory } from '../../server/routes/admin-company-checks';
import { getAccess, getAccessBulk } from '../../server/services/access';
import { lapseOverdue, isCompanyType } from '../../server/services/companyChecks/preIncorporation';
import { fakeChClient, declaration } from '../helpers/fakeCompaniesHouse';

const CUSTOMER = 30501;
const LATE = 30502;
const SOLE = 30503;

describe('pre-incorporation', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;
    const token = (id: number) => `Bearer ${makeUserToken({ id, email: `preinc-${id}@example.com` })}`;
    const decl = (id: number, body: object) => request(app).post('/api/account/company-declaration').set('Authorization', token(id)).send(body);
    const getDecl = (id: number) => request(app).get('/api/account/company-declaration').set('Authorization', token(id));
    const proposed = (extra: object = {}) => ({ proposed_company_name: 'Example Newco Ltd', ...declaration(), ...extra });
    let preId = 0;

    beforeAll(async () => {
        process.env.COMPANIES_HOUSE_API_KEY = 'test-key-not-real';
        setChClientFactory(() => fakeChClient({}));
        const now = Date.now();
        for (const [id, type] of [[CUSTOMER, 'limited_company'], [LATE, 'llp'], [SOLE, 'sole_trader']] as const) {
            await getPool().query(
                `INSERT INTO "user" (id, email, password, first_name, last_name, business_type, is_admin, role, status, kyc_status, is_sole_controller, created_at, updated_at)
                 VALUES ($1, $2, 'x', 'Test', 'User', $3, false, 'user', 'active', 'approved', true, $4, $4) ON CONFLICT (id) DO NOTHING`,
                [id, `preinc-${id}@example.com`, type, now]);
        }
    });

    it('recognises company business types', () => {
        expect(['limited_company', 'Limited Company', 'llp', 'plc'].every(isCompanyType)).toBe(true);
        expect(['sole_trader', 'partnership', 'other', '', null].some(isCompanyType)).toBe(false);
    });

    it('a company customer with no company number is held until they tell us about the proposed company', async () => {
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).toContain('company_checks_pending');
        expect(a!.company).toMatchObject({ preIncorporation: 'needed', declarationNeeded: true });
        expect((await getAccess(SOLE))!.missing).not.toContain('company_checks_pending');
        const g = await getDecl(CUSTOMER);
        expect(g.body.data).toMatchObject({ required: true, mode: 'proposed', editable: true, pre_incorporation: null, deadline_days: 30 });
    });

    it('the proposed company needs a name and the same declaration as an incorporated company', async () => {
        const noName = await decl(CUSTOMER, proposed({ proposed_company_name: '' }));
        expect(noName.status).toBe(400);
        expect(noName.body.issues.map((i: any) => i.path)).toContain('proposed_company_name');
        expect((await decl(CUSTOMER, proposed({ people: [] }))).status).toBe(400);
        const ok = await decl(CUSTOMER, proposed({ people: [declaration().people[0],
            { full_name: 'Future Director', email: 'future.director@example.com', is_account_holder: false, is_director: true, is_beneficial_owner: false, other_control: false, country_of_residence: 'England' }] }));
        expect(ok.status).toBe(201);
        expect(ok.body.data.owners_invited).toEqual(['Future Director']);
        expect((await decl(CUSTOMER, proposed())).status).toBe(409);
        const a = await getAccess(CUSTOMER);
        expect(a!.company.preIncorporation).toBe('in_review');
        expect(a!.missing).toContain('company_checks_pending');
    });

    it('it appears in the administrators\' queue to review', async () => {
        const r = await request(app).get('/api/admin/company-checks?view=action').set('Authorization', admin);
        const item = r.body.data.items.find((i: any) => i.kind === 'pre_incorporation' && i.user_id === CUSTOMER);
        expect(item).toMatchObject({ company_name: 'Example Newco Ltd', next: { key: 'review_proposed' } });
        preId = Number(String(item.id).replace('pre-', ''));
        const d = await request(app).get(`/api/admin/company-checks/pre/${preId}`).set('Authorization', admin);
        expect(d.status).toBe(200);
        expect(d.body.data.identity.others).toEqual([{ name: 'Future Director', status: 'not_started' }]);
    });

    it('returning it needs a reason; the customer corrects it and resubmits', async () => {
        const post = (body: object) => request(app).post(`/api/admin/company-checks/pre/${preId}/decision`).set('Authorization', admin).send(body);
        expect((await post({ decision: 'return', reason: 'short' })).body.error).toBe('reason_required');
        expect((await post({ decision: 'return', reason: 'Please add the second shareholder you mentioned.' })).status).toBe(200);
        const g = await getDecl(CUSTOMER);
        expect(g.body.data).toMatchObject({ editable: true, pre_incorporation: { status: 'returned', reason: 'Please add the second shareholder you mentioned.' } });
        expect((await getAccess(CUSTOMER))!.company.declarationNeeded).toBe(true);
        expect((await decl(CUSTOMER, proposed({ proposed_company_name: 'Example Newco Limited' }))).status).toBe(201);
        const rows = (await getPool().query(`SELECT status, proposed_name FROM pre_incorporation WHERE user_id = $1`, [CUSTOMER])).rows;
        expect(rows).toEqual([{ status: 'submitted', proposed_name: 'Example Newco Limited' }]);
    });

    it('approval gives access for 30 days, for that one company', async () => {
        const r = await request(app).post(`/api/admin/company-checks/pre/${preId}/decision`).set('Authorization', admin).send({ decision: 'approve' });
        expect(r.status).toBe(200);
        const row = (await getPool().query(`SELECT deadline_at FROM pre_incorporation WHERE id = $1`, [preId])).rows[0];
        const days = (new Date(row.deadline_at).getTime() - Date.now()) / 86400000;
        expect(days).toBeGreaterThan(29.9);
        expect(days).toBeLessThan(30.1);
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).not.toContain('company_checks_pending');
        expect(a!.company).toMatchObject({ preIncorporation: 'approved' });
        expect((await request(app).post(`/api/admin/company-checks/pre/${preId}/decision`).set('Authorization', admin).send({ decision: 'refuse', reason: 'Changed my mind entirely' })).status).toBe(409);
    });

    it('when the company number arrives, the company becomes a new customer: a check compares the register with what was declared', async () => {
        const r = await request(app).patch('/api/profile/company-details').set('Authorization', token(CUSTOMER)).send({ company_number: '12345678' });
        expect(r.status).toBe(200);
        const p = (await getPool().query(`SELECT status, company_number FROM pre_incorporation WHERE id = $1`, [preId])).rows[0];
        expect(p).toEqual({ status: 'incorporated', company_number: '12345678' });
        const d = (await getPool().query(`SELECT from_pre_incorporation FROM company_declaration WHERE user_id = $1`, [CUSTOMER])).rows;
        expect(d).toEqual([{ from_pre_incorporation: String(preId) }]);
        const check = (await getPool().query(`SELECT id, status, snapshot IS NOT NULL AS has_snapshot FROM company_check WHERE user_id = $1`, [CUSTOMER])).rows[0];
        expect(check.has_snapshot).toBe(true);
        // Full service waits for that check.
        const a = await getAccess(CUSTOMER);
        expect(a!.missing).toContain('company_checks_pending');
        expect(a!.company.preIncorporation).toBeUndefined();
        // The number is now locked for the customer.
        expect((await request(app).patch('/api/profile/company-details').set('Authorization', token(CUSTOMER)).send({ company_number: '87654321' })).status).toBe(403);
    });

    it('an approval not followed by incorporation within 30 days lapses, and an administrator confirms the address was not used', async () => {
        expect((await decl(LATE, proposed({ proposed_company_name: 'Late Partners LLP' }))).status).toBe(201);
        const id = Number((await getPool().query(`SELECT id FROM pre_incorporation WHERE user_id = $1`, [LATE])).rows[0].id);
        await request(app).post(`/api/admin/company-checks/pre/${id}/decision`).set('Authorization', admin).send({ decision: 'approve' });
        await getPool().query(`UPDATE pre_incorporation SET deadline_at = NOW() - interval '1 hour' WHERE id = $1`, [id]);
        // Access is withdrawn at the deadline, before the hourly job runs.
        const a = await getAccess(LATE);
        expect(a!.missing).toContain('company_number_overdue');
        expect(await lapseOverdue(getPool() as any)).toBeGreaterThanOrEqual(1);
        const q = await request(app).get('/api/admin/company-checks?view=action').set('Authorization', admin);
        expect(q.body.data.items.find((i: any) => i.id === `pre-${id}`).next.key).toBe('lapsed');
        const review = (note: string) => request(app).post(`/api/admin/company-checks/pre/${id}/lapse-review`).set('Authorization', admin).send({ note });
        expect((await review('ok')).status).toBe(400);
        expect((await review('Searched Companies House: not incorporated. No mail received for this name.')).status).toBe(200);
        expect((await review('Searched again, same outcome as before.')).status).toBe(409);
        const audit = await getPool().query(`SELECT action FROM audit_log WHERE entity = 'pre_incorporation' AND entity_id = $1 ORDER BY id`, [String(id)]);
        expect(audit.rows.map((r: any) => r.action)).toEqual(['pre_incorporation_submitted', 'pre_incorporation_lapsed']);
        const adminAudit = await getPool().query(`SELECT action FROM admin_audit WHERE target_type = 'pre_incorporation' AND target_id = $1 ORDER BY id`, [id]);
        expect(adminAudit.rows.map((r: any) => r.action)).toEqual(['pre_incorporation_approved', 'pre_incorporation_lapse_reviewed']);
    });

    it('is for administrators only', async () => {
        expect([401, 403]).toContain((await request(app).get(`/api/admin/company-checks/pre/${preId}`).set('Authorization', token(CUSTOMER))).status);
        expect([401, 403]).toContain((await request(app).post(`/api/admin/company-checks/pre/${preId}/decision`).set('Authorization', token(CUSTOMER)).send({ decision: 'approve' })).status);
    });

    it('the admin list\'s bulk access decision matches the per-customer one for every account', async () => {
        const ids = (await getPool().query(`SELECT id FROM "user" ORDER BY id`)).rows.map((r: any) => Number(r.id));
        const now = Date.now();
        const bulk = await getAccessBulk(ids, getPool() as any, now);
        for (const id of ids) expect(bulk.get(id)).toEqual(await getAccess(id, getPool() as any, now));
    });

    it('the customer list groups accounts by what happens next, with counts', async () => {
        const r = await request(app).get('/api/admin/users?pageSize=500').set('Authorization', admin);
        expect(r.status).toBe(200);
        const { items, counts } = r.body;
        expect(counts.all).toBe(items.length);
        expect(counts.needs_you + counts.waiting + counts.active + counts.restricted).toBeLessThanOrEqual(counts.all);
        const late = items.find((u: any) => Number(u.id) === LATE);
        // No subscription in tests, so payment is the first thing outstanding.
        expect(late).toMatchObject({ service_label: 'Awaiting payment', stage: 'waiting' });
        expect(late.next_step).toMatch(/pay/);
        const order = ['needs_you', 'restricted', 'waiting', 'active', 'staff'];
        const ranks = items.map((u: any) => order.indexOf(u.stage));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b)); // people who need us first
        const only = await request(app).get('/api/admin/users?stage=waiting&pageSize=500').set('Authorization', admin);
        expect(only.body.items.every((u: any) => u.stage === 'waiting')).toBe(true);
        expect(only.body.total).toBe(counts.waiting);
        const stats = await request(app).get('/api/admin/users/stats').set('Authorization', admin);
        expect(stats.body.data.total).toBeGreaterThanOrEqual(3);
    });
});
