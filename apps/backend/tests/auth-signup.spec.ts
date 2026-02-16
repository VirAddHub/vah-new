/**
 * Signup endpoint: 201 for new email, 409 with EMAIL_ALREADY_EXISTS for duplicate.
 */

import request from 'supertest';
import app from '../src/server';

function validSignupBody(overrides: { email?: string } = {}) {
    const email = overrides.email ?? `signup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
    return {
        first_name: 'Test',
        last_name: 'User',
        email,
        password: 'Password123!',
        business_type: 'limited_company' as const,
        country_of_incorporation: 'GB' as const,
        company_name: 'Test Ltd',
        forward_to_first_name: 'Forward',
        forward_to_last_name: 'Name',
        address_line1: '1 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        forward_country: 'GB' as const,
        isSoleController: true,
    };
}

describe('POST /api/auth/signup', () => {
    it('signup with new email => 201', async () => {
        const body = validSignupBody();
        const res = await request(app)
            .post('/api/auth/signup')
            .send(body)
            .expect(201);

        expect(res.body).toHaveProperty('ok', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data.user).toHaveProperty('email', body.email.toLowerCase());
    });

    it('signup with same email again => 409 with error.code === "EMAIL_ALREADY_EXISTS"', async () => {
        const email = `duplicate-${Date.now()}@example.com`;
        const body = validSignupBody({ email });

        const first = await request(app).post('/api/auth/signup').send(body);
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/auth/signup')
            .send(body)
            .expect(409);

        expect(second.body).toHaveProperty('ok', false);
        expect(second.body).toHaveProperty('error');
        expect(second.body.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
        expect(second.body.error).toHaveProperty('message');
        expect(typeof second.body.error.message).toBe('string');
    });
});
