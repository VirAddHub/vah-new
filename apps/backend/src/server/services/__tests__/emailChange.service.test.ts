// Email change confirmation against the real test database (moved out of the routes test, where
// the service was mocked for the whole file and these checks could never have run as written).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/mailer', () => ({ sendTemplateEmail: vi.fn().mockResolvedValue(undefined) }));

import { getPool } from '../../db';
import { confirmEmailChange } from '../emailChange';
import { hashToken } from '../../security/tokens';

describe('confirmEmailChange', () => {
    let userId: number;
    const oldEmail = () => `old-${userId}@example.com`;
    const newEmail = `new-${Date.now()}@example.com`;

    beforeEach(async () => {
        const r = await getPool().query(
            `INSERT INTO "user" (email, password, first_name, last_name, status, plan_status, created_at, updated_at, is_sole_controller)
             VALUES ($1, 'x', 'Test', 'User', 'active', 'active', $2, $2, true) RETURNING id`,
            [`tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`, Date.now()]);
        userId = Number(r.rows[0].id);
        await getPool().query('UPDATE "user" SET email = $2 WHERE id = $1', [userId, oldEmail()]);
    });
    afterEach(async () => {
        await getPool().query('DELETE FROM email_change_request WHERE user_id = $1', [userId]);
    });

    const insertRequest = (token: string, minutes: number, used = false) =>
        getPool().query(
            `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, used_at, created_at)
             VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, ${used ? 'NOW()' : 'NULL'}, NOW())`,
            [userId, newEmail, hashToken(token), String(minutes)]);

    it('changes the email and marks the request used for a valid token', async () => {
        await insertRequest(`valid-${userId}`, 30);
        expect((await confirmEmailChange(`valid-${userId}`)).changed).toBe(true);
        const u = await getPool().query('SELECT email FROM "user" WHERE id = $1', [userId]);
        expect(u.rows[0].email).toBe(newEmail);
        const r = await getPool().query('SELECT used_at FROM email_change_request WHERE token_hash = $1', [hashToken(`valid-${userId}`)]);
        expect(r.rows[0].used_at).not.toBeNull();
    });

    it('does nothing for an expired token', async () => {
        await insertRequest(`expired-${userId}`, -1);
        expect((await confirmEmailChange(`expired-${userId}`)).changed).toBe(false);
        const u = await getPool().query('SELECT email FROM "user" WHERE id = $1', [userId]);
        expect(u.rows[0].email).toBe(oldEmail());
    });

    it('does nothing for an unknown token', async () => {
        expect((await confirmEmailChange('invalid-token-xyz')).changed).toBe(false);
    });

    it('does nothing for a token that was already used', async () => {
        await insertRequest(`used-${userId}`, 30, true);
        expect((await confirmEmailChange(`used-${userId}`)).changed).toBe(false);
    });
});
