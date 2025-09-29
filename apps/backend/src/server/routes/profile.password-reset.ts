import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';
import { generateRawToken, hashToken, verifyToken } from '../security/reset-token';
import { sendTemplateEmail } from '../../lib/mailer';
import { ENV } from '../../env';

// Config via env with sensible defaults
const TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30);
const RL_WINDOW_MIN = Number(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES ?? 15);
const RL_MAX = Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX ?? 5);

const limiter = rateLimit({
  windowMs: RL_WINDOW_MIN * 60_000,
  max: RL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // IPv6-safe: use helper on req.ip (string | undefined)
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});

export const passwordResetRouter = Router();

/**
 * POST /api/profile/reset-password-request
 * body: { email: string }
 * Always 204 to avoid account enumeration.
 */
passwordResetRouter.post('/reset-password-request', limiter, async (req, res) => {
  const email = String((req.body?.email ?? '')).trim().toLowerCase();
  if (!email) return res.sendStatus(204);

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, first_name, email FROM "user" WHERE lower(email) = $1 LIMIT 1',
    [email]
  );
  const user = rows[0];

  if (user) {
    const raw = generateRawToken(32);
    const tokenHash = await hashToken(raw);

    await pool.query(
      `UPDATE "user"
          SET reset_token_hash = $1,
              reset_token_expires_at = NOW() + INTERVAL '${TTL_MINUTES} minutes',
              reset_token_used_at = NULL
        WHERE id = $2`,
      [tokenHash, user.id]
    );

    const resetLink = `${ENV.APP_BASE_URL}/reset-password/confirm?token=${encodeURIComponent(raw)}`;

    // Your mailer + template model builder (camelCase ➜ snake_case) is used here
    try {
      await sendTemplateEmail({
        to: user.email,
        templateAlias: 'password-reset-email',
        model: {
          firstName: user.first_name,
          resetLink,
          expiryMinutes: String(TTL_MINUTES),
        },
      });
    } catch (err) {
      // We still return 204; just log
      console.error('password-reset email send failed', err);
    }
  }

  return res.status(200).json({ ok: true, message: 'If that email exists, we\'ve sent a link.' });
});

/**
 * POST /api/profile/reset-password
 * body: { token: string, newPassword: string }
 */
passwordResetRouter.post('/reset-password', limiter, async (req, res) => {
  const token = String(req.body?.token ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  // Server-side strength (mirror your FE rules)
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'weak_password' });
  }
  if (!token) return res.status(400).json({ error: 'invalid_token' });

  const pool = getPool();
  // Fetch candidates with live tokens (keep result set small)
  const { rows } = await pool.query(
    `SELECT id, reset_token_hash, reset_token_expires_at, reset_token_used_at
       FROM "user"
      WHERE reset_token_hash IS NOT NULL
        AND reset_token_expires_at IS NOT NULL
        AND reset_token_expires_at > NOW()
        AND reset_token_used_at IS NULL
      LIMIT 500`
  );

  let matched: any = null;
  for (const u of rows) {
    if (u.reset_token_hash && await verifyToken(token, u.reset_token_hash)) {
      matched = u;
      break;
    }
  }

  if (!matched) {
    return res.status(400).json({ error: 'invalid_or_expired_token' });
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    'UPDATE "user" SET password = $1, reset_token_used_at = NOW(), reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = $2',
    [passwordHash, matched.id]
  );

  // Optional: send "password changed" notification with your existing template system

  return res.status(200).json({ ok: true, message: 'Password has been successfully reset.' });
});
