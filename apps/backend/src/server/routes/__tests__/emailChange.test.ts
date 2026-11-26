// Email/phone change routes. The email-change service is mocked here (its own behaviour is tested
// against the real database in server/services/__tests__/emailChange.service.test.ts).
// Converted from Jest to Vitest; previously this file could not load under the project's runner.
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

vi.mock('../../services/emailChange', () => ({
    requestEmailChange: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendEmailChangeConfirmation: vi.fn(),
}));
vi.mock('../../../lib/mailer', () => ({ sendTemplateEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../middleware/auth', () => ({
    requireAuth: (req: any, _res: any, next: any) => { req.user = { id: '1001' }; next(); },
}));

import { getPool } from '../../db';
import profileEmailChangeRouter from '../profileEmailChange';
import { requestEmailChange, confirmEmailChange } from '../../services/emailChange';

const app = express();
app.use(express.json());
app.use('/api/profile', profileEmailChangeRouter);

const USER = 1001; // fixture user created by src/tests/globalSetup.ts
const PASSWORD = 'Fixture-Pass1'; // synthetic test password set below

describe('Email change routes', () => {
    let originalPhone: string | null = null;
    let originalPasswordHash: string | null = null;

    beforeEach(async () => {
        vi.mocked(requestEmailChange).mockReset();
        vi.mocked(confirmEmailChange).mockReset();
        const r = await getPool().query('SELECT phone FROM "user" WHERE id = $1', [USER]);
        originalPhone = r.rows[0]?.phone ?? null;
    });
    beforeAll(async () => {
        const r = await getPool().query('SELECT password FROM "user" WHERE id = $1', [USER]);
        originalPasswordHash = r.rows[0]?.password ?? null;
        await getPool().query('UPDATE "user" SET password = $2 WHERE id = $1', [USER, await bcrypt.hash(PASSWORD, 4)]);
    });
    afterAll(async () => {
        await getPool().query('UPDATE "user" SET phone = $2, password = $3 WHERE id = $1', [USER, originalPhone, originalPasswordHash]);
    });

    describe('PATCH /api/profile/contact', () => {
        it('starts an email change (confirmation link) when an email is given', async () => {
            vi.mocked(requestEmailChange).mockResolvedValue(undefined as any);
            const res = await request(app).patch('/api/profile/contact').send({ email: 'newemail@example.com', currentPassword: PASSWORD }).expect(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.email_change_started).toBe(true);
            expect(vi.mocked(requestEmailChange).mock.calls[0].slice(0, 3)).toEqual([USER, 'newemail@example.com', 'test@example.com']);
        });

        it('refuses an email change without the current password (security review F30)', async () => {
            const res = await request(app).patch('/api/profile/contact').send({ email: 'newemail@example.com' }).expect(400);
            expect(res.body.error).toBe('current_password_required');
            expect(vi.mocked(requestEmailChange)).not.toHaveBeenCalled();
        });

        it('refuses an email change with the wrong password', async () => {
            const res = await request(app).patch('/api/profile/contact').send({ email: 'newemail@example.com', currentPassword: 'Wrong-Pass1' }).expect(401);
            expect(res.body.error).toBe('incorrect_current_password');
            expect(vi.mocked(requestEmailChange)).not.toHaveBeenCalled();
        });

        it('refuses a phone change: the phone number is fixed at sign-up', async () => {
            const before = await getPool().query('SELECT phone FROM "user" WHERE id = $1', [USER]);
            const res = await request(app).patch('/api/profile/contact').send({ phone: '+44 20 1234 5678' }).expect(403);
            expect(res.body.error).toBe('support_required');
            const after = await getPool().query('SELECT phone FROM "user" WHERE id = $1', [USER]);
            expect(after.rows[0].phone).toBe(before.rows[0].phone);
        });

        it('rejects a request with neither email nor phone', async () => {
            const res = await request(app).patch('/api/profile/contact').send({}).expect(400);
            expect(res.body.ok).toBe(false);
            expect(res.body.error).toBe('no_updates_provided');
        });

        it('gives the same reply when the email is already in use (no enumeration)', async () => {
            vi.mocked(requestEmailChange).mockResolvedValue(undefined as any);
            const res = await request(app).patch('/api/profile/contact').send({ email: 'admin@example.com', currentPassword: PASSWORD }).expect(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.email_change_started).toBe(true);
        });
    });

    describe('GET /api/profile/confirm-email-change', () => {
        it('confirms with a valid token', async () => {
            vi.mocked(confirmEmailChange).mockResolvedValue({ changed: true });
            const res = await request(app).get('/api/profile/confirm-email-change').query({ token: 'valid-token' }).expect(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.changed).toBe(true);
            expect(confirmEmailChange).toHaveBeenCalledWith('valid-token');
        });

        it('returns changed=false for an invalid or expired token, without saying which', async () => {
            vi.mocked(confirmEmailChange).mockResolvedValue({ changed: false });
            const res = await request(app).get('/api/profile/confirm-email-change').query({ token: 'invalid-token' }).expect(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data).toEqual({ changed: false });
        });

        it('a missing token changes nothing and gets the same generic reply', async () => {
            const res = await request(app).get('/api/profile/confirm-email-change').expect(200);
            expect(res.body.data).toEqual({ changed: false });
            expect(confirmEmailChange).not.toHaveBeenCalled();
        });
    });
});
