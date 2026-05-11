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
 *   - At most 100 characters (bcrypt truncates at 72 bytes anyway)
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
    .regex(/\d/, 'Password must contain a number');
