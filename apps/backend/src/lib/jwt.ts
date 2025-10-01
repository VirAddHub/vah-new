import jwt from 'jsonwebtoken';

// Helper function to initialize keys safely
function getJwtKeys(): { signKey: string | Buffer; verifyKey: string | Buffer } {
  const ALG = (process.env.JWT_ALG || 'HS256') as 'HS256' | 'RS256';

  if (ALG === 'RS256') {
    const priv = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const pub = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!priv || !pub) {
      throw new Error('JWT_PUBLIC_KEY and JWT_PRIVATE_KEY are required for RS256 algorithm');
    }
    return { signKey: priv, verifyKey: pub };
  } else {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return { signKey: secret, verifyKey: secret };
  }
}

// Initialize keys on startup
let signKey: string | Buffer;
let verifyKey: string | Buffer;

try {
  const keys = getJwtKeys();
  signKey = keys.signKey;
  verifyKey = keys.verifyKey;
} catch (error) {
  console.error("FATAL: JWT key initialization failed.", error);
  throw error;
}

// Define JWT constants
const ALG = (process.env.JWT_ALG || 'HS256') as 'HS256' | 'RS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// FIX: Removed `as const` and added an explicit type to prevent the readonly mismatch.
const baseOpts: jwt.SignOptions = {
  issuer: 'virtualaddresshub',
  audience: 'vah-users',
  algorithm: ALG,
};

export interface JWTPayload {
  id: string | number;
  email: string;
  is_admin?: boolean;
  role?: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // Combine base options with the specific expiration for this token
  return jwt.sign(payload, signKey, { ...baseOpts, expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const verifyOptions: jwt.VerifyOptions = {
      issuer: baseOpts.issuer,
      audience: baseOpts.audience,
      algorithms: [ALG],
    };
    return jwt.verify(token, verifyKey, verifyOptions) as JWTPayload;
  } catch (error) {
    if (!(error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError)) {
      console.error('JWT verification encountered an unexpected error:', error);
    }
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}