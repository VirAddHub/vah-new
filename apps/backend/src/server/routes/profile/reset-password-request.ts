// apps/backend/src/server/routes/profile/reset-password-request.ts
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../../db';
import { sendTemplateEmail } from '../../../lib/mailer';
import { buildPasswordResetModel } from '../../../lib/mail/models';
import { APP_BASE_URL } from '../../../config/env';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = Router();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});

const Body = z.object({
  email: z.string().email(),
});

// POST /api/profile/reset-password-request
router.post('/api/profile/reset-password-request', limiter, async (req, res) => {
  try {
    // 1) Validate input (don't leak details on failure)
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(200)
        .json({ ok: true, message: "If that email exists, we've sent a link." });
    }
    const { email } = parsed.data;

    // 2) Lookup user (never branch response by existence)
    let user: { id: string; email: string; first_name?: string } | null = null;
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id, first_name, email FROM "user" WHERE lower(email) = $1 LIMIT 1',
        [email.toLowerCase()]
      );
      user = rows[0] || null;
    } catch (e) {
      console.error('[reset-password-request] user lookup failed:', (e as Error).message);
    }

    // 3) If user exists, create token, store, and attempt to email — all guarded
    if (user) {
      try {
        const raw = crypto.randomBytes(32).toString('hex'); // plaintext token
        const hash = await bcrypt.hash(raw, 12);
        const ttlMinutes = 30;
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        // Store token in database
        const pool = getPool();
        await pool.query(
          `UPDATE "user" 
           SET reset_token_hash = $1, 
               reset_token_expires_at = $2, 
               reset_token_used_at = NULL 
           WHERE id = $3`,
          [hash, expiresAt.toISOString(), user.id]
        );

        try {
          const model = buildPasswordResetModel({
            firstName: user.first_name || 'there',
            rawToken: raw,
            ttlMinutes,
          });
          await sendTemplateEmail({
            to: user.email,
            templateAlias: 'password-reset-email',
            model,
          });
        } catch (mailErr) {
          console.error(
            '[reset-password-request] email send failed:',
            (mailErr as Error).message,
            { APP_BASE_URL }
          );
          // swallow: still return neutral 200
        }
      } catch (tokenErr) {
        console.error('[reset-password-request] token/save failed:', (tokenErr as Error).message);
        // swallow: still return neutral 200
      }
    }

    // 4) Always neutral response (no enumeration)
    return res
      .status(200)
      .json({ ok: true, message: "If that email exists, we've sent a link." });
  } catch (err) {
    console.error('[reset-password-request] fatal:', (err as Error).message);
    // 5) Never 500 outward — keep UX smooth and avoid enumeration
    return res
      .status(200)
      .json({ ok: true, message: "If that email exists, we've sent a link." });
  }
});

export default router;
