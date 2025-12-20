// apps/backend/src/server/routes/__tests__/emailChange.test.ts
// Tests for email change verification functionality

import request from 'supertest';
import express from 'express';
import { getPool } from '../../../db';
import profileEmailChangeRouter from '../profileEmailChange';
import { requestEmailChange, confirmEmailChange } from '../../services/emailChange';
import { hashToken } from '../../security/tokens';

// Mock the email change service
jest.mock('../../services/emailChange');
jest.mock('../../../lib/mailer', () => ({
    sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(express.json());
app.use('/api/profile', profileEmailChangeRouter);

// Mock auth middleware
const mockRequireAuth = (req: any, res: any, next: any) => {
    req.user = { id: '1' };
    next();
};

// Replace requireAuth in the router (hacky but works for tests)
const originalRequireAuth = require('../../middleware/auth').requireAuth;
jest.mock('../../middleware/auth', () => ({
    requireAuth: mockRequireAuth,
}));

describe('Email Change Routes', () => {
    let pool: any;

    beforeAll(async () => {
        pool = getPool();
    });

    beforeEach(async () => {
        // Clean up test data
        await pool.query('DELETE FROM email_change_request WHERE user_id = 1');
        await pool.query('DELETE FROM activity_log WHERE user_id = 1');
        jest.clearAllMocks();
    });

    describe('PATCH /api/profile/contact', () => {
        it('should create email change request when email provided', async () => {
            const mockRequestEmailChange = requestEmailChange as jest.MockedFunction<typeof requestEmailChange>;
            mockRequestEmailChange.mockResolvedValue(undefined);

            const response = await request(app)
                .patch('/api/profile/contact')
                .send({ email: 'newemail@example.com' })
                .expect(200);

            expect(response.body.ok).toBe(true);
            expect(response.body.data.message).toContain('confirmation link');
            expect(mockRequestEmailChange).toHaveBeenCalledWith(
                1,
                'newemail@example.com',
                expect.any(String),
                expect.anything(),
                expect.anything()
            );
        });

        it('should update phone immediately when phone provided', async () => {
            // Mock user exists
            await pool.query(`
                INSERT INTO "user" (id, email, phone, created_at, updated_at)
                VALUES (1, 'test@example.com', 'old-phone', $1, $1)
                ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone
            `, [Date.now()]);

            const response = await request(app)
                .patch('/api/profile/contact')
                .send({ phone: '+44 20 1234 5678' })
                .expect(200);

            expect(response.body.ok).toBe(true);

            // Verify phone was updated
            const userResult = await pool.query('SELECT phone FROM "user" WHERE id = 1');
            expect(userResult.rows[0].phone).toBe('+44 20 1234 5678');
        });

        it('should return error if neither email nor phone provided', async () => {
            const response = await request(app)
                .patch('/api/profile/contact')
                .send({})
                .expect(400);

            expect(response.body.ok).toBe(false);
            expect(response.body.error).toBe('no_updates_provided');
        });

        it('should return generic success even if email already exists (no enumeration)', async () => {
            // Create another user with the email
            await pool.query(`
                INSERT INTO "user" (id, email, created_at, updated_at)
                VALUES (2, 'existing@example.com', $1, $1)
                ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
            `, [Date.now()]);

            const mockRequestEmailChange = requestEmailChange as jest.MockedFunction<typeof requestEmailChange>;
            mockRequestEmailChange.mockResolvedValue(undefined); // Service returns success even if email taken

            const response = await request(app)
                .patch('/api/profile/contact')
                .send({ email: 'existing@example.com' })
                .expect(200);

            // Should return success (no enumeration)
            expect(response.body.ok).toBe(true);
            expect(response.body.data.message).toContain('confirmation link');
        });
    });

    describe('GET /api/profile/confirm-email-change', () => {
        it('should confirm email change with valid token', async () => {
            const mockConfirmEmailChange = confirmEmailChange as jest.MockedFunction<typeof confirmEmailChange>;
            mockConfirmEmailChange.mockResolvedValue({ changed: true });

            const response = await request(app)
                .get('/api/profile/confirm-email-change')
                .query({ token: 'valid-token' })
                .expect(200);

            expect(response.body.ok).toBe(true);
            expect(response.body.data.changed).toBe(true);
            expect(mockConfirmEmailChange).toHaveBeenCalledWith('valid-token');
        });

        it('should return changed=false for invalid/expired token (no enumeration)', async () => {
            const mockConfirmEmailChange = confirmEmailChange as jest.MockedFunction<typeof confirmEmailChange>;
            mockConfirmEmailChange.mockResolvedValue({ changed: false });

            const response = await request(app)
                .get('/api/profile/confirm-email-change')
                .query({ token: 'invalid-token' })
                .expect(200);

            expect(response.body.ok).toBe(true);
            expect(response.body.data.changed).toBe(false);
            // Generic message, doesn't reveal if token was invalid or expired
            expect(response.body.data.message).toBeDefined();
        });

        it('should return error if token missing', async () => {
            const response = await request(app)
                .get('/api/profile/confirm-email-change')
                .expect(400);

            expect(response.body.ok).toBe(false);
            expect(response.body.error).toBe('token_required');
        });
    });
});

describe('Email Change Service', () => {
    let pool: any;

    beforeAll(async () => {
        pool = getPool();
    });

    beforeEach(async () => {
        // Clean up test data
        await pool.query('DELETE FROM email_change_request');
        await pool.query('DELETE FROM activity_log WHERE action LIKE \'email_change%\'');
        
        // Create test user
        await pool.query(`
            INSERT INTO "user" (id, email, first_name, created_at, updated_at)
            VALUES (1, 'old@example.com', 'Test', $1, $1)
            ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
        `, [Date.now()]);
    });

    afterEach(async () => {
        await pool.query('DELETE FROM email_change_request');
        await pool.query('DELETE FROM activity_log WHERE action LIKE \'email_change%\'');
    });

    describe('confirmEmailChange', () => {
        it('should update user email and mark request as used with valid token', async () => {
            // Create email change request
            const token = 'test-token-123';
            const tokenHash = hashToken(token);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 30);

            await pool.query(
                `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [1, 'new@example.com', tokenHash, expiresAt]
            );

            // Confirm email change
            const result = await confirmEmailChange(token);

            expect(result.changed).toBe(true);

            // Verify user email updated
            const userResult = await pool.query('SELECT email FROM "user" WHERE id = 1');
            expect(userResult.rows[0].email).toBe('new@example.com');

            // Verify request marked as used
            const requestResult = await pool.query(
                'SELECT used_at FROM email_change_request WHERE token_hash = $1',
                [tokenHash]
            );
            expect(requestResult.rows[0].used_at).not.toBeNull();
        });

        it('should return changed=false for expired token', async () => {
            const token = 'expired-token';
            const tokenHash = hashToken(token);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() - 1); // Expired

            await pool.query(
                `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [1, 'new@example.com', tokenHash, expiresAt]
            );

            const result = await confirmEmailChange(token);

            expect(result.changed).toBe(false);

            // Verify user email NOT updated
            const userResult = await pool.query('SELECT email FROM "user" WHERE id = 1');
            expect(userResult.rows[0].email).toBe('old@example.com');
        });

        it('should return changed=false for invalid token', async () => {
            const result = await confirmEmailChange('invalid-token-xyz');

            expect(result.changed).toBe(false);
        });

        it('should return changed=false for already used token', async () => {
            const token = 'used-token';
            const tokenHash = hashToken(token);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 30);

            await pool.query(
                `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, used_at, created_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [1, 'new@example.com', tokenHash, expiresAt]
            );

            const result = await confirmEmailChange(token);

            expect(result.changed).toBe(false);
        });
    });
});

