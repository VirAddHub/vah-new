/**
 * Integration test for standardized API response format
 * Verifies that endpoints return { ok, data } or { ok, error } format
 */

import request from 'supertest';
import { app } from '../src/server';

describe('API Response Format', () => {
    describe('GET /api/auth/whoami', () => {
        it('should return 401 with { ok: false, error: { code, message } } when unauthenticated', async () => {
            const response = await request(app)
                .get('/api/auth/whoami')
                .expect(401);

            expect(response.body).toHaveProperty('ok', false);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
        });
    });

    describe('GET /api/plans', () => {
        it('should return 200 with { ok: true, data: { items, page, page_size, total } }', async () => {
            const response = await request(app)
                .get('/api/plans')
                .expect(200);

            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('items');
            expect(response.body.data).toHaveProperty('page');
            expect(response.body.data).toHaveProperty('page_size');
            expect(response.body.data).toHaveProperty('total');
            expect(Array.isArray(response.body.data.items)).toBe(true);
        });
    });
});
