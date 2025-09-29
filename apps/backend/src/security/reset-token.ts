import crypto from "crypto";
import bcrypt from "bcryptjs";

const DEFAULT_TTL_MIN = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function generateResetTokenRaw(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url"); // URL-safe
}

export async function hashToken(raw: string): Promise<string> {
  return bcrypt.hash(raw, BCRYPT_ROUNDS);
}

export async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}

export function expiryFromNow(ttlMinutes = DEFAULT_TTL_MIN): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + ttlMinutes);
  return d;
}
