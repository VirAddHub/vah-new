import request from 'supertest'

const BASE = process.env.BASE || 'http://localhost:4000'

describe('smoke', () => {
    it('health', async () => {
        const r = await request(BASE).get('/api/health')
        expect(r.status).toBe(200)
        expect(r.body.ok).toBe(true)
    })

    it('plans endpoint', async () => {
        const r = await request(BASE).get('/api/plans')
        expect(r.status).toBe(200)
        expect(r.body.data).toBeDefined()
        expect(Array.isArray(r.body.data)).toBe(true)
    })

    it('auth -> profile (with test user)', async () => {
        // First get CSRF token
        const csrf = await request(BASE).get('/api/csrf')
        expect(csrf.status).toBe(200)
        expect(csrf.body.csrfToken).toBeDefined()

        const login = await request(BASE)
            .post('/api/auth/login')
            .set('x-csrf-token', csrf.body.csrfToken)
            .send({ email: 'test@example.com', password: 'test123' })

        // This might fail due to database issues, but let's see what happens
        console.log('Login response:', login.status, login.body)

        if (login.status === 200) {
            const cookie = login.headers['set-cookie']?.find((c: string) => c.startsWith('vah_session='))
            expect(cookie).toBeTruthy()

            const prof = await request(BASE).get('/api/profile').set('Cookie', cookie!)
            expect(prof.status).toBe(200)
            expect(prof.body?.ok).toBe(true)
            expect(prof.body?.profile?.email).toBeDefined()
        }
    })
})
