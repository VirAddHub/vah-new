import request from 'supertest';

const BASE = process.env.BASE || 'http://localhost:4000';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

describe('auth flow', () => {
    const agent = request.agent(BASE);

    it('csrf', async () => {
        const res = await agent.get('/api/csrf');
        expect(res.status).toBe(200);
        expect(res.body?.token).toBeTruthy();
    });

    it('login -> whoami -> profile -> logout', async () => {
        // 1) initial CSRF (pre-login) just to prove endpoint works
        const csrf1 = await agent.get('/api/csrf');
        expect(csrf1.status).toBe(200);
        expect(csrf1.body?.token).toBeTruthy();

        // 2) login
        const login = await agent
            .post('/api/auth/login')
            .set('x-csrf-token', csrf1.body.token)
            .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
        expect(login.status).toBe(200);
        expect(login.body?.user?.id).toBeTruthy();

        // 3) whoami/profile should be authenticated now
        const whoami = await agent.get('/api/auth/whoami');
        expect(whoami.status).toBe(200);

        const profile = await agent.get('/api/profile');
        // in some builds profile may be 200 or 403 depending on KYC gating — assert cookie-based auth worked:
        expect([200, 403]).toContain(profile.status);

        // 4) IMPORTANT: refresh CSRF AFTER login (cookie/secret may have rotated)
        const csrf2 = await agent.get('/api/csrf');
        expect(csrf2.status).toBe(200);
        expect(csrf2.body?.token).toBeTruthy();

        // 5) logout with fresh CSRF
        const logout = await agent.post('/api/auth/logout').set('x-csrf-token', csrf2.body.token);
        // some apps return 200 or 204 on logout; accept both
        expect([200, 204]).toContain(logout.status);

        // 6) subsequent profile should be unauthenticated
        const profileAfter = await agent.get('/api/profile');
        expect([401, 403]).toContain(profileAfter.status);
    });
});