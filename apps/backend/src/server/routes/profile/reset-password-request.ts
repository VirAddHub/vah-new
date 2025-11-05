// apps/backend/src/server/routes/profile/reset-password-request.ts
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../../db';
import { sendTemplateEmail } from '../../../lib/mailer';
import { Templates } from '../../../lib/postmark-templates';
import { APP_BASE_URL } from '../../../config/env';
import { withTimeout } from '../../../lib/withTimeout';
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

// POST /reset-password-request
router.post('/reset-password-request', limiter, async (req, res) => {
  // 1) Validate quickly
  const parsed = Body.safeParse(req.body);
  // Always reply **immediately** (prevents 90–100s proxy timeouts)
  res.status(200).json({ ok: true, message: "If that email exists, we've sent a link." });

  if (!parsed.success) return; // done

  const { email } = parsed.data;

  // 2) Do the rest **off the response path**
  queueMicrotask(async () => {
    try {
      // Lookup user (cap at 1500ms)
      const user = await withTimeout(
        (async () => {
          const pool = getPool();
          const { rows } = await pool.query(
            'SELECT id, name, first_name, email FROM "user" WHERE lower(email) = $1 LIMIT 1',
            [email.toLowerCase()]
          );
          return rows[0] || null;
        })(),
        1500,
        'user lookup'
      ).catch(e => { console.error('[reset] lookup', e.message); return null; });

      if (!user) return;

      // Generate token fast (sync + bcrypt)
      const raw = crypto.randomBytes(32).toString('hex');
      const hash = await bcrypt.hash(raw, 12);
      const ttlMinutes = 30;
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      // Save token (cap at 1500ms)
      const saved = await withTimeout(
        (async () => {
          const pool = getPool();
          await pool.query(
            `UPDATE "user" 
             SET reset_token_hash = $1, 
                 reset_token_expires_at = $2, 
                 reset_token_used_at = NULL 
             WHERE id = $3`,
            [hash, expiresAt.toISOString(), user.id]
          );
          return true;
        })(),
        1500,
        'token save'
      ).catch(e => { console.error('[reset] save', e.message); return null; });

      if (!saved) return;

      // Send email **fire-and-forget** with a short timeout (don't block)
      withTimeout(
        sendTemplateEmail({
          to: user.email,
          templateAlias: Templates.PasswordReset,
          model: {
            firstName: user.name || user.first_name || 'there',
            resetLink: `${APP_BASE_URL}/reset-password/confirm?token=${encodeURIComponent(raw)}`,
            expiryMinutes: ttlMinutes,
          },
        }),
        2000,
        'email send'
      ).catch(e => {
        console.error('[reset] email send failed:', {
          message: e.message,
          stack: e.stack,
          email: user.email,
          templateAlias: Templates.PasswordReset,
        });
      });
    } catch (e: any) {
      console.error('[reset] fatal', e.message);
    }
  });
});

export default router;
