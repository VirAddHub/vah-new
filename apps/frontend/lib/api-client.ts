// apps/frontend/lib/api-client.ts
import { api } from './api';
import { setToken, clearToken } from './token-manager';

type Ok<T> = { ok: true; data: T } | { ok: false; error?: string; message?: string };

export const AuthAPI = {
  async login(email: string, password: string) {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();

    // temporary debug – remove after verification
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__VAH_LAST_LOGIN_JSON__ = json;
      // console.debug('🔍 LOGIN RESP ->', json);
    }

    if (!json?.ok) {
      throw new Error(json?.message || json?.error || 'Login failed');
    }

    // BACKEND SHAPE: { ok: true, data: { ..., token } }
    const token: string | undefined = json?.data?.token ?? json?.token;
    if (!token) throw new Error('No token in response');

    setToken(token);
    return json;
  },

  async whoami() {
    const res = await api('/api/auth/whoami', { method: 'GET' });
    return res.json() as Promise<Ok<{ user_id: string; email: string; role?: string; is_admin?: boolean }>>;
  },

  async logout() {
    clearToken();
    return { ok: true } as const;
  },
};