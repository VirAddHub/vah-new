const request = require('supertest');
// Set environment to disable side effects
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../../dist/server/index.js');
const { loginAdmin } = require('../_helpers');

describe('Admin API Smoke Tests', () => {
    const agent = request.agent(app);

    beforeAll(async () => {
        // Login as admin
        await loginAdmin(agent);
    });

    test('GET /api/admin/plans - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/admin/plans');
        expect(res.status).toBe(401);
    });

    test('GET /api/admin/plans - admin returns 200', async () => {
        const res = await agent.get('/api/admin/plans');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('PATCH /api/admin/plans/{param} - unauthenticated returns 401', async () => {
        const res = await request(app).patch('/api/admin/plans/123');
        expect(res.status).toBe(401);
    });

    test('PATCH /api/admin/plans/{param} - admin returns 200 or 404', async () => {
        const res = await agent.patch('/api/admin/plans/123').send({});
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('GET /api/admin/users - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('GET /api/admin/users - admin returns 200', async () => {
        const res = await agent.get('/api/admin/users');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('PATCH /api/admin/users/{param} - unauthenticated returns 401', async () => {
        const res = await request(app).patch('/api/admin/users/123');
        expect(res.status).toBe(401);
    });

    test('PATCH /api/admin/users/{param} - admin returns 200 or 404', async () => {
        const res = await agent.patch('/api/admin/users/123').send({});
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('PUT /api/admin/users/{param}/kyc-status - unauthenticated returns 401', async () => {
        const res = await request(app).put('/api/admin/users/123/kyc-status');
        expect(res.status).toBe(401);
    });

    test('PUT /api/admin/users/{param}/kyc-status - admin returns 200 or 404', async () => {
        const res = await agent.put('/api/admin/users/123/kyc-status').send({});
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });
});
