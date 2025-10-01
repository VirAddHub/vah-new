// apps/frontend/lib/api-base.ts
const RAW = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
export const API_BASE = RAW.replace(/\/+$/, '');

export function API(path: string) {
  const p = `/${path}`.replace(/\/{2,}/g, '/');
  // collapse accidental /api/api at the start (defense in depth)
  const clean = p.replace(/^\/api\/api(\/|$)/, '/api$1');
  return `${API_BASE}${clean}`;
}