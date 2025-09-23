const request = require('supertest');
// Set environment to disable side effects
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../../dist/server/index.js');

describe('Mail API Smoke Tests', () => {
    const agent = request.agent(app);
    const email = 'mail-test@example.com';
    const pass = 'Password123!';

    beforeAll(async () => {
        // Create test user
        await agent.post('/api/auth/signup').send({
            email,
            password: pass,
            first_name: 'Mail',
            last_name: 'Test'
        });
    });

    test('GET /api/mail-items - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/mail-items');
        expect(res.status).toBe(401);
    });

    test('GET /api/mail-items - authenticated returns 200', async () => {
        const res = await agent.get('/api/mail-items');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/mail-items/{param} - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/mail-items/123');
        expect(res.status).toBe(401);
    });

    test('GET /api/mail-items/{param} - authenticated returns 200 or 404', async () => {
        const res = await agent.get('/api/mail-items/123');
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('GET /api/mail-items/{param}/history - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/mail-items/123/history');
        expect(res.status).toBe(401);
    });

    test('GET /api/mail-items/{param}/history - authenticated returns 200 or 404', async () => {
        const res = await agent.get('/api/mail-items/123/history');
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('GET /api/mail-items/{param}/scan-url - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/mail-items/123/scan-url');
        expect(res.status).toBe(401);
    });

    test('GET /api/mail-items/{param}/scan-url - authenticated returns 200 or 404', async () => {
        const res = await agent.get('/api/mail-items/123/scan-url');
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('POST /api/mail-items/bulk - unauthenticated returns 401', async () => {
        const res = await request(app).post('/api/mail-items/bulk');
        expect(res.status).toBe(401);
    });

    test('POST /api/mail-items/bulk - authenticated returns 200 or 400', async () => {
        const res = await agent.post('/api/mail-items/bulk').send({});
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('PATCH /api/mail-items/{param} - unauthenticated returns 401', async () => {
        const res = await request(app).patch('/api/mail-items/123');
        expect(res.status).toBe(401);
    });

    test('PATCH /api/mail-items/{param} - authenticated returns 200 or 404', async () => {
        const res = await agent.patch('/api/mail-items/123').send({});
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('POST /api/mail/forward - unauthenticated returns 401', async () => {
        const res = await request(app).post('/api/mail/forward');
        expect(res.status).toBe(401);
    });

    test('POST /api/mail/forward - authenticated returns 200 or 400', async () => {
        const res = await agent.post('/api/mail/forward').send({});
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });
});
