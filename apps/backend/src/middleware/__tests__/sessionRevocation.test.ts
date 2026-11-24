// Server-side session rules (security review F20, F26, F29): revoked sessions, privilege from the
// database rather than the token, and an absolute lifetime. Uses the fixture users from globalSetup.
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticateJWT, requireAuth } from '../auth';
import { generateToken } from '../../lib/jwt';
import { getPool } from '../../server/db';
import { bumpSessionVersion, currentSessionVersion, SESSION_ABSOLUTE_MAX_SECONDS } from '../../lib/sessionVersion';

const app = express();
app.use(cookieParser());
app.use(authenticateJWT);
app.get('/me', requireAuth, (req: any, res) => res.json({ id: req.user.id, is_admin: req.user.is_admin }));

const CUSTOMER = 1001;

async function tokenFor(id: number, extra: Record<string, unknown> = {}) {
    return generateToken({ id, email: 'x@example.com', is_admin: false, role: 'user', sv: await currentSessionVersion(id), ...extra } as any);
}

describe('session revocation', () => {
    afterAll(async () => {
        await getPool().query('UPDATE "user" SET is_admin = false WHERE id = $1', [CUSTOMER]);
    });

    it('accepts a current session', async () => {
        const t = await tokenFor(CUSTOMER);
        await request(app).get('/me').set('Cookie', `vah_session=${t}`).expect(200);
    });

    it('rejects a token issued before the session version was bumped (logout / reset / role change)', async () => {
        const old = await tokenFor(CUSTOMER);
        await bumpSessionVersion(CUSTOMER);
        const res = await request(app).get('/me').set('Cookie', `vah_session=${old}`).expect(401);
        expect(res.body.error).toBe('session_revoked');
        const fresh = await tokenFor(CUSTOMER);
        await request(app).get('/me').set('Cookie', `vah_session=${fresh}`).expect(200);
    });

    it('takes admin rights from the database, not from the token', async () => {
        const forged = await tokenFor(CUSTOMER, { is_admin: true, role: 'admin' });
        const res = await request(app).get('/me').set('Cookie', `vah_session=${forged}`).expect(200);
        expect(res.body.is_admin).toBe(false);
    });

    it('ends a session after the absolute lifetime even if it was refreshed', async () => {
        const started = Math.floor(Date.now() / 1000) - SESSION_ABSOLUTE_MAX_SECONDS - 60;
        const t = await tokenFor(CUSTOMER, { auth_time: started });
        await request(app).get('/me').set('Cookie', `vah_session=${t}`).expect(401);
    });
});
