const request = require('supertest');
// Set environment to disable side effects
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../../dist/server/index.js');

describe('Billing API Smoke Tests', () => {
    const agent = request.agent(app);
    const email = 'billing-test@example.com';
    const pass = 'Password123!';

    beforeAll(async () => {
        // Create test user
        await agent.post('/api/auth/signup').send({
            email,
            password: pass,
            first_name: 'Billing',
            last_name: 'Test'
        });
    });

    test('GET /api/billing - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/billing');
        expect(res.status).toBe(401);
    });

    test('GET /api/billing - authenticated returns 200', async () => {
        const res = await agent.get('/api/billing').set('x-test-bypass', '1');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/billing/invoices - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/billing/invoices');
        expect(res.status).toBe(401);
    });

    test('GET /api/billing/invoices - authenticated returns 200', async () => {
        const res = await agent.get('/api/billing/invoices').set('x-test-bypass', '1');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok');
    });

    test('GET /api/billing/invoices/{param}/link - unauthenticated returns 401', async () => {
        const res = await request(app).get('/api/billing/invoices/123/link');
        expect(res.status).toBe(401);
    });

    test('GET /api/billing/invoices/{param}/link - authenticated returns 200 or 404', async () => {
        const res = await agent.get('/api/billing/invoices/123/link').set('x-test-bypass', '1');
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });
});
