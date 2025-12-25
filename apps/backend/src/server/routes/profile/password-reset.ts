import { Router } from "express";
import type { Pool } from "pg";
import { generateResetTokenRaw, hashToken, verifyToken, expiryFromNow } from "../../../security/reset-token";
import { sendTemplateEmail } from "../../../lib/mailer";
import { Templates } from "../../../lib/postmark-templates";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { BCRYPT_ROUNDS } from "../../../config/auth";
import { logger } from "../../../lib/logger";

const ttl = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30);

export default function passwordResetRouter(pool: Pool) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  });

  // No user enumeration: always 204
  router.post("/reset-password-request", limiter, async (req, res) => {
    try {
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      if (!email) return res.sendStatus(204);

      const { rows } = await pool.query(
        "SELECT id, first_name FROM \"user\" WHERE lower(email) = $1 LIMIT 1",
        [email]
      );

      if (rows.length === 0) return res.sendStatus(204);

      const user = rows[0];
      const raw = generateResetTokenRaw();
      const hash = await hashToken(raw);
      const expiresAt = expiryFromNow(ttl);

      await pool.query(
        `UPDATE "user" SET reset_token_hash = $1, reset_token_expires_at = $2, reset_token_used_at = NULL WHERE id = $3`,
        [hash, expiresAt.toISOString(), user.id]
      );

      // fire-and-forget; do not leak errors (non-blocking)
      sendTemplateEmail({
        to: email,
        templateAlias: Templates.PasswordReset,
        model: {
          firstName: user.first_name || 'there',
          resetLink: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password/confirm?token=${encodeURIComponent(raw)}`,
          expiryMinutes: ttl,
        },
      }).catch((err) => {
        logger.warn('[profile/password-reset] email_send_failed_nonfatal', {
          message: err instanceof Error ? err.message : String(err),
          templateAlias: Templates.PasswordReset,
        });
      });

      return res.sendStatus(204);
    } catch (err) {
      // Still avoid enumeration
      return res.sendStatus(204);
    }
  });

  router.post("/reset-password", limiter, async (req, res) => {
    const token = String(req.body?.token ?? "");
    const newPassword = String(req.body?.password ?? "");

    if (!token || !newPassword) return res.status(400).json({ error: "missing_fields" });

    // Basic strong password requirement
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strong.test(newPassword)) return res.status(400).json({ error: "weak_password" });

    const { rows } = await pool.query(
      `SELECT id, reset_token_hash, reset_token_expires_at, reset_token_used_at
         FROM "user"
        WHERE reset_token_hash IS NOT NULL
          AND reset_token_expires_at IS NOT NULL
          AND reset_token_used_at IS NULL
        LIMIT 500` // small scan; we'll verify hash below
    );

    // Find matching user by comparing bcrypt
    let matched: any = null;
    for (const r of rows) {
      if (r.reset_token_hash && await verifyToken(token, r.reset_token_hash)) {
        matched = r;
        break;
      }
    }
    if (!matched) return res.status(400).json({ error: "invalid_or_expired" });

    // Expired?
    if (new Date(matched.reset_token_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "invalid_or_expired" });
    }

    // Update password + invalidate token
    // Use your existing password hash helper (e.g., argon2/bcrypt). Reuse what login uses.
    const bcrypt = await import("bcrypt");
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      `UPDATE "user"
          SET password = $1,
              reset_token_hash = NULL,
              reset_token_expires_at = NULL,
              reset_token_used_at = NOW()
        WHERE id = $2`,
      [newHash, matched.id]
    );

    return res.status(204).end();
  });

  return router;
}
