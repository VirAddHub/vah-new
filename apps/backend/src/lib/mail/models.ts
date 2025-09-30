// apps/backend/src/lib/mail/models.ts
import { APP_BASE_URL } from '../../config/env';

export function buildPasswordResetModel(opts: {
  firstName: string;
  rawToken: string; // non-hashed token
  ttlMinutes: number;
}) {
  const resetUrl = `${APP_BASE_URL}/reset-password/confirm?token=${encodeURIComponent(
    opts.rawToken
  )}`;

  return {
    name: opts.firstName, // Updated to match Postmark template
    reset_url: resetUrl,
    ttl_minutes: opts.ttlMinutes,
  };
}
