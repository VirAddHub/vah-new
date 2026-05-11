import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/server/session';
import { LoginPageClient } from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Login | VirtualAddressHub',
  description: 'Sign in to your VirtualAddressHub account.',
};

// Always evaluate auth on the server for this page
export const dynamic = 'force-dynamic';

/**
 * Decode JWT payload without verification — UX routing only.
 * The admin dashboard enforces real auth via requireBffAdmin + useVerifiedAdminSession.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function LoginPage() {
  const session = await getSessionFromCookies();

  if (session.authenticated && session.token) {
    const payload = decodeJwtPayload(session.token);
    const isAdmin = payload?.is_admin === true || payload?.role === 'admin';
    redirect(isAdmin ? '/admin/dashboard' : '/mail');
  }

  return <LoginPageClient />;
}

