const request = require('supertest');
// Set environment to disable side effects
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../../dist/server/index.js');

describe('System API Smoke Tests', () => {
    const agent = request.agent(app);
    const email = 'system-test@example.com';
    const pass = 'Password123!';

    beforeAll(async () => {
        // Create test user
        await agent.post('/api/auth/signup').send({
            email,
            password: pass,
            first_name: 'System',
            last_name: 'Test'
        });
    });

    test('GET /api/forwarding-requests - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/forwarding-requests');
        expect(res.status).toBe(401);
    });

    test('GET /api/forwarding-requests - authenticated returns 200', async () => {
        const res = await agent.get('/api/forwarding-requests');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/forwarding-requests/usage - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/forwarding-requests/usage');
        expect(res.status).toBe(401);
    });

    test('GET /api/forwarding-requests/usage - authenticated returns 200', async () => {
        const res = await agent.get('/api/forwarding-requests/usage');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/downloads/{param} - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/downloads/123');
        expect(res.status).toBe(401);
    });

    test('GET /api/downloads/{param} - authenticated returns 200 or 404', async () => {
        const res = await agent.get('/api/downloads/123');
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('GET /api/notifications/unread - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/notifications/unread');
        expect(res.status).toBe(401);
    });

    test('GET /api/notifications/unread - authenticated returns 200', async () => {
        const res = await agent.get('/api/notifications/unread');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/ready - public endpoint returns 200', async () => {
        const res = await request(app).get('/api/ready');
        expect(res.status).toBe(200);
    });

    test('GET /api/metrics - public endpoint returns 200', async () => {
        const res = await request(app).get('/api/metrics');
        expect(res.status).toBe(200);
    });
});
