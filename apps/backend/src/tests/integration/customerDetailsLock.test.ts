// Customers can change only their email (with confirmation) and password after sign-up.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';

const USER = 30005;

describe('customer details are fixed after sign-up', () => {
    const app = createTestApp();
    const token = makeUserToken({ id: USER, email: 'locked@example.com' });
    beforeAll(async () => {
        const now = Date.now();
        await getPool().query(
            `INSERT INTO "user" (id, email, password, first_name, last_name, company_name, company_number, phone, is_admin, role, status, is_sole_controller, created_at, updated_at)
             VALUES ($1, 'locked@example.com', 'x', 'Lock', 'Ed', 'Locked Ltd', '12345678', '+447700900123', false, 'user', 'active', true, $2, $2)
             ON CONFLICT (id) DO NOTHING`, [USER, now]);
    });
    afterAll(async () => { await getPool().query(`DELETE FROM "user" WHERE id = $1`, [USER]); });

    const attempts: Array<[string, string, object]> = [
        ['PATCH', '/api/profile', { first_name: 'Changed' }],
        ['PATCH', '/api/profile', { forwarding_address: '1 Other Street' }],
        ['PATCH', '/api/profile/me', { company_name: 'Changed Ltd' }],
        ['PATCH', '/api/profile/me', { email: 'bypass@example.com' }],
        ['PATCH', '/api/profile/controllers', { isSoleController: false, additionalControllersCount: 2 }],
        ['PATCH', '/api/profile/company-details', { company_number: '87654321' }],
        ['PATCH', '/api/profile/contact', { phone: '+447700900999' }],
    ];
    for (const [method, path, body] of attempts) {
        it(`${method} ${path} ${Object.keys(body).join(',')} is refused`, async () => {
            const res = await (request(app) as any)[method.toLowerCase()](path).set('Authorization', `Bearer ${token}`).send(body);
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('support_required');
        });
    }

    it('leaves every stored detail unchanged', async () => {
        const u = (await getPool().query(`SELECT first_name, company_name, company_number, phone, email, forwarding_address FROM "user" WHERE id = $1`, [USER])).rows[0];
        expect(u).toMatchObject({ first_name: 'Lock', company_name: 'Locked Ltd', company_number: '12345678', phone: '+447700900123', email: 'locked@example.com' });
        expect(u.forwarding_address ?? null).toBeNull();
    });

    it('admins can still change customer details', async () => {
        const admin = makeAdminToken();
        const res = await request(app).patch('/api/profile').set('Authorization', `Bearer ${admin}`).send({ first_name: 'Admin' });
        expect(res.status).not.toBe(403);
    });
});
