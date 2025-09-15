import request from 'supertest';

const BASE = process.env.BASE || 'http://localhost:4000';

describe('auth flow', () => {
    const agent = request.agent(BASE); // keep cookies

    it('csrf', async () => {
        const r = await agent.get('/api/csrf');
        expect(r.status).toBe(200);
        expect(r.body).toBeTruthy();
    });

    it('login -> whoami -> profile -> logout', async () => {
        const csrf = await agent.get('/api/csrf');
        const token = csrf.body?.token || csrf.body?.csrfToken;

        const login = await agent
            .post('/api/auth/login')
            .set('x-csrf-token', token)
            .send({ email: 'admin@virtualaddresshub.co.uk', password: 'Admin123!' });
        expect(login.status).toBe(200);

        const whoami = await agent.get('/api/auth/whoami');
        expect(whoami.status).toBe(200);
        expect(whoami.body?.user?.email).toMatch(/virtualaddresshub\.co\.uk$/);

        const profile = await agent.get('/api/profile');
        expect(profile.status).toBe(200);

        const logout = await agent.post('/api/auth/logout').set('x-csrf-token', token);
        expect(logout.status).toBe(200);

        const profileAfter = await agent.get('/api/profile');
        expect(profileAfter.status).toBe(401);
    });
});
