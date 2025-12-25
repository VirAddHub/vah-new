import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../../config/auth';

export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url'); // URL-safe, no padding
}

export async function hashToken(raw: string): Promise<string> {
  return bcrypt.hash(raw, BCRYPT_ROUNDS);
}

export async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
