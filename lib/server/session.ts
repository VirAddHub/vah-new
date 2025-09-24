// Server-safe session utilities (no React, no client-side code)
import { cookies } from 'next/headers';

export interface SessionData {
  token: string | null;
  role: 'user' | 'admin';
  user: any | null;
  authenticated: boolean;
}

export function getSessionFromCookies(): SessionData {
  const cookieStore = cookies();
  const token = cookieStore.get('vah_session')?.value ?? '';
  const role = (cookieStore.get('vah_role')?.value ?? 'user') as 'user' | 'admin';
  const userStr = cookieStore.get('vah_user')?.value ?? '';
  
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }

  return {
    token,
    role,
    user,
    authenticated: Boolean(token)
  };
}

export function createSessionResponse(session: SessionData) {
  return {
    ok: true,
    user: session.user,
    role: session.role,
    authenticated: session.authenticated
  };
}
