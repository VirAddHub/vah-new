import { z } from 'zod';

/**
 * Canonical password policy for VirtualAddressHub.
 *
 * Import this schema in every place that validates a password so the rules
 * stay in sync automatically:
 *   - POST /api/auth/signup
 *   - POST /api/auth/reset-password/confirm
 *
 * Rules:
 *   - At least 8 characters
 *   - At most 72 bytes in UTF-8: bcrypt ignores anything past 72 bytes, so longer passwords
 *     would give a false sense of strength (security review F23). Existing longer passwords still
 *     sign in; only new or changed passwords are checked.
 *   - At least one lowercase letter
 *   - At least one uppercase letter
 *   - At least one digit
 */
export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be at most 100 characters long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
        message: 'Password is too long (maximum 72 bytes; fewer if it uses accented letters or symbols)',
    });
