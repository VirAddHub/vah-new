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
    first_name: opts.firstName, // Template expects first_name
    reset_link: resetUrl, // Template expects reset_link
    expiry_minutes: opts.ttlMinutes, // Template expects expiry_minutes
  };
}
