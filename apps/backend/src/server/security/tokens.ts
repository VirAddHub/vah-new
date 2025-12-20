// apps/backend/src/server/security/tokens.ts
// Token generation and hashing utilities for email change verification

import crypto from 'crypto';

/**
 * Generate a secure random token for email change verification
 * Returns a 64-character hex string (32 bytes)
 */
export function generateEmailChangeToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 * Returns a 64-character hex string
 * 
 * Only the hash is stored in the database, never the original token
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

