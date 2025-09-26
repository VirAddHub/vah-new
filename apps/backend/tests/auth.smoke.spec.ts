import request from 'supertest';

const BASE = process.env.BASE || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TestPassword123!';

describe('auth flow', () => {
    const agent = request.agent(BASE);

    it('csrf', async () => {
        const res = await agent.get('/api/csrf');
        expect(res.status).toBe(200);
        expect(res.body?.token).toBeTruthy();
    });

    it('login -> whoami -> profile -> logout', async () => {
        // 1) CSRF before login
        const csrf1 = await agent.get('/api/csrf');
        expect(csrf1.status).toBe(200);
        expect(csrf1.body?.token).toBeTruthy();

        // 2) login with env-provided creds
        const login = await agent
            .post('/api/auth/login')
            .set('x-csrf-token', csrf1.body.token)
            .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

        expect(login.status).toBe(200);
        // Accept either shape {id,...} or {user:{id,...}}
        const uid = (login.body && (login.body.id || login.body.user?.id)) || null;
        expect(uid).toBeTruthy();

        // 3) authenticated checks
        const whoami = await agent.get('/api/auth/whoami');
        expect(whoami.status).toBe(200);

        const profile = await agent.get('/api/profile');
        expect([200, 403]).toContain(profile.status);

        // 4) refresh CSRF after login (rotation)
        const csrf2 = await agent.get('/api/csrf');
        expect(csrf2.status).toBe(200);
        expect(csrf2.body?.token).toBeTruthy();

        // 5) logout with fresh CSRF
        const logout = await agent.post('/api/auth/logout').set('x-csrf-token', csrf2.body.token);
        expect([200, 204]).toContain(logout.status);

        // 6) should be unauthenticated now
        const profileAfter = await agent.get('/api/profile');
        expect([401, 403]).toContain(profileAfter.status);
    });
});