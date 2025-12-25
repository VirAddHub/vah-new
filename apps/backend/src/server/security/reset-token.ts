import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url'); // URL-safe, no padding
}

export async function hashToken(raw: string): Promise<string> {
  return bcrypt.hash(raw, 12);
}

export async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
