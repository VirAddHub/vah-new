import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET ?? 'test-secret';

// Must match the issuer/audience in src/lib/jwt.ts
const JWT_ISSUER = 'virtualaddresshub';
const JWT_AUDIENCE = 'vah-users';

export function makeUserToken(overrides: Partial<{
  id: number;
  email: string;
  role: string;
  is_admin: boolean;
}> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      id: overrides.id ?? 1001,
      email: overrides.email ?? 'test@example.com',
      role: overrides.role ?? 'user',
      is_admin: overrides.is_admin ?? false,
      iat: now,
      exp: now + 3600,
    },
    TEST_SECRET,
    {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: 'HS256',
    }
  );
}

export function makeAdminToken() {
  return makeUserToken({ id: 9999, role: 'admin', is_admin: true });
}
