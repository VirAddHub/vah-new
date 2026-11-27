// Legal name changes: staff only, recorded with the previous name, reason and document checked.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';

const ID = 30601;

describe('legal name change', () => {
    const app = createTestApp();
    const admin = `Bearer ${makeAdminToken()}`;
    const customer = `Bearer ${makeUserToken({ id: ID, email: 'rename@example.com' })}`;
    const change = (body: object, auth = admin) => request(app).post(`/api/admin/users/${ID}/name-change`).set('Authorization', auth).send(body);
    const valid = { first_name: 'Jane', last_name: 'Smith', reason: 'marriage', evidence: 'Marriage certificate (original seen on video call)', reference: 'Drive/KYC/30601' };

    beforeAll(async () => {
        const now = Date.now();
        await getPool().query(
            `INSERT INTO "user" (id, email, password, first_name, last_name, business_type, is_admin, role, status, kyc_status, is_sole_controller, created_at, updated_at)
             VALUES ($1, 'rename@example.com', 'x', 'Jane', 'Jones', 'sole_trader', false, 'user', 'active', 'approved', true, $2, $2) ON CONFLICT (id) DO NOTHING`, [ID, now]);
    });

    it('customers cannot change their own name', async () => {
        expect((await request(app).patch('/api/profile').set('Authorization', customer).send({ last_name: 'Smith' })).status).toBe(403);
        expect([401, 403]).toContain((await change(valid, customer)).status);
    });

    it('the general edit no longer renames anyone silently', async () => {
        const r = await request(app).patch(`/api/admin/users/${ID}`).set('Authorization', admin).send({ last_name: 'Smith' });
        expect(r.status).toBe(400);
        expect(r.body.error).toBe('use_name_change');
    });

    it('a name change needs a reason, the document checked and where it is kept', async () => {
        const r = await change({ first_name: 'Jane', last_name: 'Smith', reason: 'marriage' });
        expect(r.status).toBe(400);
        expect(r.body.message).toMatch(/document you checked/);
        expect((await change({ ...valid, reason: 'whim' })).status).toBe(400);
        expect((await change({ ...valid, last_name: 'Jones' })).body.error).toBe('no_changes');
    });

    it('records the change permanently, keeps the previous name, and leaves identity as it was', async () => {
        const r = await change(valid);
        expect(r.status).toBe(201);
        const u = (await getPool().query(`SELECT first_name, last_name, kyc_status FROM "user" WHERE id = $1`, [ID])).rows[0];
        expect(u).toEqual({ first_name: 'Jane', last_name: 'Smith', kyc_status: 'approved' });
        const h = await request(app).get(`/api/admin/users/${ID}/name-changes`).set('Authorization', admin);
        expect(h.body.data[0]).toMatchObject({ previous_last_name: 'Jones', new_last_name: 'Smith', reason: 'marriage', reason_label: 'Marriage or civil partnership', reference: 'Drive/KYC/30601' });
        await expect(getPool().query(`UPDATE user_name_change SET new_last_name = 'X' WHERE user_id = $1`, [ID])).rejects.toThrow();
        await expect(getPool().query(`DELETE FROM user_name_change WHERE user_id = $1`, [ID])).rejects.toThrow();
        const a = await getPool().query(`SELECT details FROM admin_audit WHERE action = 'user_name_changed' AND target_id = $1`, [ID]);
        expect(JSON.parse(a.rows[0].details)).toMatchObject({ from: 'Jane Jones', to: 'Jane Smith', reason: 'marriage' });
    });

    it('other edits keep the previous value in the audit record', async () => {
        expect((await request(app).patch(`/api/admin/users/${ID}`).set('Authorization', admin).send({ company_name: 'Smith Studio' })).status).toBe(200);
        const a = await getPool().query(`SELECT details FROM admin_audit WHERE action = 'update_user' AND target_id = $1 ORDER BY id DESC LIMIT 1`, [ID]);
        expect(JSON.parse(a.rows[0].details)).toMatchObject({ company_name: 'Smith Studio', previous: { company_name: null } });
    });
});
