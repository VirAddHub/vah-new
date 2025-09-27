const request = require('supertest');
// Set environment to disable side effects
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../../dist/server/index.js');

describe('Support API Smoke Tests', () => {
    const agent = request.agent(app);
    const email = 'support-test@example.com';
    const pass = 'Password123!';

    beforeAll(async () => {
        // Create test user
        await agent.post('/api/auth/signup').send({
            email,
            password: pass,
            first_name: 'Support',
            last_name: 'Test'
        });
    });

    test('POST /api/support - unauthenticated returns 401', async () => {
        const res = await request(app).post('/api/support');
        expect(res.status).toBe(401);
    });

    test('POST /api/support - authenticated returns 200 or 400', async () => {
        const res = await agent.post('/api/support').send({
            subject: 'Test Support Request',
            message: 'This is a test support request'
        });
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });

    test('POST /api/gdpr-export - unauthenticated returns 401', async () => {
        const res = await request(app).post('/api/gdpr-export');
        expect(res.status).toBe(401);
    });

    test('POST /api/gdpr-export - authenticated returns 200 or 400', async () => {
        const res = await agent.post('/api/gdpr-export').send({});
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('ok');
        }
    });
});
