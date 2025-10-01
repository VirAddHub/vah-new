// apps/frontend/lib/api.ts
import { API } from './api-base';
import { getToken } from './token-manager';

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = API(path);
  // temporary debug – remove after verification
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__VAH_LAST_REQ__ = { url, headers: Object.fromEntries(headers.entries()) };
    // console.debug('🌐 API ->', url, Object.fromEntries(headers.entries()));
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });
  return res;
}