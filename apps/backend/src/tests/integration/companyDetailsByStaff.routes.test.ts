// Staff entering a customer's company details for them, and one open account per company.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { setChClientFactory } from '../../server/routes/admin-company-checks';
import { fakeChClient } from '../helpers/fakeCompaniesHouse';
import { companyNumberInUse } from '../../server/services/companyChecks/oneAccount';

const CUSTOMER = 30701;
const OTHER = 30702;
const NUMBER = '07654321';

describe('company details entered by staff', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;
    const token = (id: number) => `Bearer ${makeUserToken({ id, email: `staffentry-${id}@example.com` })}`;
    let checkId = 0;

    beforeAll(async () => {
        process.env.COMPANIES_HOUSE_API_KEY = 'test-key-not-real';
        setChClientFactory(() => fakeChClient({}));
        const now = Date.now();
        for (const id of [CUSTOMER, OTHER]) {
            await getPool().query(
                `INSERT INTO "user" (id, email, password, first_name, last_name, business_type, is_admin, role, status, kyc_status, is_sole_controller, created_at, updated_at)
                 VALUES ($1, $2, 'x', 'Test', 'User', 'limited_company', false, 'user', 'active', 'approved', true, $3, $3) ON CONFLICT (id) DO NOTHING`,
                [id, `staffentry-${id}@example.com`, now]);
        }
        const r = await request(app).post('/api/admin/company-checks').set('Authorization', admin).send({ userId: CUSTOMER, companyNumber: NUMBER });
        checkId = Number(r.body.data?.id);
        expect(checkId).toBeGreaterThan(0);
        await request(app).post(`/api/admin/company-checks/${checkId}/refresh`).set('Authorization', admin);
    });

    it('starts from the register: directors and PSCs, the account holder marked, ownership left to fill', async () => {
        const r = await request(app).get(`/api/admin/company-checks/${checkId}/declaration/prefill`).set('Authorization', admin);
        expect(r.status).toBe(200);
        expect(r.body.data.from).toBe('register');
        const people = r.body.data.data.people;
        const holder = people.find((p: any) => p.is_account_holder);
        expect(holder).toMatchObject({ full_name: 'USER, Test', is_director: true, is_beneficial_owner: true, ownership_percent: null });
        expect(holder.register_note).toMatch(/shares 75% or more/);
        expect(r.body.data.sources.phone).toBe('Phone call');
    });

    it('needs the source and a note, and the details must be complete', async () => {
        const post = (body: object) => request(app).post(`/api/admin/company-checks/${checkId}/declaration`).set('Authorization', admin).send(body);
        const data = { nature_of_business: 'Software consultancy for small businesses', principal_place_of_business: { same_as_registered_office: true },
            applicant_role: 'director_and_beneficial_owner', expected_monthly_mail: '0-10', corporate_owners: [],
            people: [{ full_name: 'Test User', email: null, is_account_holder: true, is_director: true, is_beneficial_owner: true, ownership_percent: 100, voting_percent: 100, other_control: false, country_of_residence: 'England' },
                     { full_name: 'Second Director', email: null, is_account_holder: false, is_director: true, is_beneficial_owner: false, other_control: false, country_of_residence: 'England' }] };
        expect((await post({ data })).body.error).toBe('source_required');
        expect((await post({ data, source: 'phone' })).body.error).toBe('source_note_required');
        expect((await post({ data: { ...data, nature_of_business: 'x' }, source: 'phone', source_note: 'Call with Test User 27 Nov' })).body.error).toBe('validation_error');
        // No email needed for other directors when staff enter the details.
        const ok = await post({ data, source: 'phone', source_note: 'Call with Test User, 27 Nov, 3pm' });
        expect(ok.status).toBe(201);
        const d = await request(app).get(`/api/admin/company-checks/${checkId}`).set('Authorization', admin);
        expect(d.body.data.customer.declaration).toMatchObject({ entered_source: 'phone', entered_note: 'Call with Test User, 27 Nov, 3pm' });
        expect(d.body.data.next.key).not.toBe('await_customer');
        const a = await getPool().query(`SELECT details FROM admin_audit WHERE action = 'company_check_declaration_entered' AND target_id = $1`, [checkId]);
        expect(a.rows.length).toBe(1);
    });

    it('is for administrators only', async () => {
        expect([401, 403]).toContain((await request(app).get(`/api/admin/company-checks/${checkId}/declaration/prefill`).set('Authorization', token(CUSTOMER))).status);
    });
});

describe('one open account per company', () => {
    const app = createTestApp();
    const token = (id: number) => `Bearer ${makeUserToken({ id, email: `staffentry-${id}@example.com` })}`;

    it('a company already on an open account cannot be added to another', async () => {
        await getPool().query(`UPDATE "user" SET companies_house_number = $2 WHERE id = $1`, [CUSTOMER, NUMBER]);
        expect(await companyNumberInUse(getPool() as any, '7654321', OTHER)).toBe(CUSTOMER);
        expect(await companyNumberInUse(getPool() as any, NUMBER, CUSTOMER)).toBeNull();
        const r = await request(app).patch('/api/profile/company-details').set('Authorization', token(OTHER)).send({ company_number: NUMBER });
        expect(r.status).toBe(409);
        expect(r.body.error).toBe('company_already_registered');
        const b = await request(app).post('/api/account/businesses').set('Authorization', token(OTHER)).send({ company_name: 'Copy Ltd', companies_house_number: NUMBER });
        expect(b.status).toBe(409);
    });

    it('a closed account frees the company number', async () => {
        await getPool().query(`UPDATE "user" SET deleted_at = NOW() WHERE id = $1`, [CUSTOMER]);
        expect(await companyNumberInUse(getPool() as any, NUMBER, OTHER)).toBeNull();
        await getPool().query(`UPDATE "user" SET deleted_at = NULL WHERE id = $1`, [CUSTOMER]);
    });
});

describe('company checks register download', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;

    it('gives one row per check, opens in Excel, and shows where the details came from', async () => {
        await getPool().query(`UPDATE "user" SET first_name = '=HYPERLINK("x")' WHERE id = $1`, [OTHER]);
        await request(app).post('/api/admin/company-checks').set('Authorization', admin).send({ userId: OTHER, companyNumber: '07654322' });
        const r = await request(app).get('/api/admin/exports/company-checks-register').set('Authorization', admin);
        expect(r.status).toBe(200);
        expect(r.headers['content-type']).toMatch(/text\/csv/);
        expect(r.headers['content-disposition']).toMatch(/company-checks-register-\d{4}-\d{2}-\d{2}\.csv/);
        const text = String(r.text).replace(/^﻿/, '');
        expect(text.split('\n')[0]).toMatch(/^Check ID,Customer ID,Customer,Customer email/);
        expect(text).toMatch(/07654321.*Entered by .*\(Phone call\)/);
        expect(text).toContain(`"'=HYPERLINK(""x"") User"`);
    });

    it('is for administrators only', async () => {
        const user = `Bearer ${makeUserToken({ id: CUSTOMER, email: `staffentry-${CUSTOMER}@example.com` })}`;
        expect([401, 403]).toContain((await request(app).get('/api/admin/exports/company-checks-register').set('Authorization', user)).status);
    });
});
