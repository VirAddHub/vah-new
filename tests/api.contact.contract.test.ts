import request from 'supertest';

const ORIGIN = process.env.TEST_ORIGIN ?? 'http://localhost:3000';

describe('Contact API contract', () => {
    it('returns JSON with success or error message', async () => {
        const res = await request(ORIGIN).post('/api/contact').send({
            name: 'Contract',
            email: 'contract@example.com',
            subject: 'Hello',
            message: 'Contract test',
            website: ''
        });
        expect([200, 202, 429, 400, 422]).toContain(res.status);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(typeof res.body).toBe('object');
        expect(Object.keys(res.body).length).toBeGreaterThan(0);
    });

    it('handles spam detection via honeypot', async () => {
        const res = await request(ORIGIN).post('/api/contact').send({
            name: 'Spam Bot',
            email: 'spam@example.com',
            subject: 'Spam',
            message: 'Spam message',
            website: 'http://spam.com'
        });
        expect([400, 422]).toContain(res.status);
        expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('validates required fields', async () => {
        const res = await request(ORIGIN).post('/api/contact').send({
            name: 'Test User',
            email: 'test@example.com',
            website: ''
        });
        expect([400, 422]).toContain(res.status);
        expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('validates email format', async () => {
        const res = await request(ORIGIN).post('/api/contact').send({
            name: 'Test User',
            email: 'invalid-email',
            subject: 'Test',
            message: 'Test message',
            website: ''
        });
        expect([400, 422]).toContain(res.status);
        expect(res.headers['content-type']).toMatch(/application\/json/);
    });
});
