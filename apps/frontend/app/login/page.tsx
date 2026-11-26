import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/server/session';
import { LoginPageClient } from './LoginPageClient';
import { isAdminRole } from '@/lib/verifiedAdminSession';
import { getBackendOrigin } from '@/lib/server/backendOrigin';

export const metadata: Metadata = {
    // Sign-in pages are not search results.
    robots: { index: false, follow: true },
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

/**
 * Where an already signed-in customer goes: the inbox in full service, otherwise the account
 * overview (outstanding steps and how much mail is waiting). Same rule as a fresh sign-in.
 */
async function customerLanding(token: string): Promise<string> {
  try {
    const res = await fetch(`${getBackendOrigin()}/api/access`, {
      headers: { Cookie: `vah_session=${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok && json.data?.level !== 'full') return '/account/overview';
  } catch {
    // fall through
  }
  return '/mail';
}

export default async function LoginPage() {
  const session = await getSessionFromCookies();

  if (session.authenticated && session.token) {
    const payload = decodeJwtPayload(session.token);
    const isAdmin = payload?.is_admin === true || isAdminRole(payload?.role as string | null | undefined);
    if (isAdmin) redirect('/admin/dashboard');
    redirect(await customerLanding(session.token));
  }

  return <LoginPageClient />;
}

