import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { isCrossSiteMutation, middleware } from '../middleware';

// Security review F28: the BFF must refuse state-changing requests that come from other sites
// before any route copies the browser's cookies (and CSRF cookie) to the API.
const req = (method: string, headers: Record<string, string> = {}, url = 'https://app.example.test/api/bff/profile') =>
  new NextRequest(url, { method, headers });

describe('cross-site mutation guard', () => {
  it('allows same-origin writes and all reads', () => {
    expect(isCrossSiteMutation(req('POST', { origin: 'https://app.example.test' }))).toBe(false);
    expect(isCrossSiteMutation(req('GET', { origin: 'https://evil.example' }))).toBe(false);
    expect(isCrossSiteMutation(req('POST', { 'sec-fetch-site': 'same-origin' }))).toBe(false);
  });

  it('blocks writes from another site', () => {
    expect(isCrossSiteMutation(req('POST', { origin: 'https://evil.example' }))).toBe(true);
    expect(isCrossSiteMutation(req('DELETE', { 'sec-fetch-site': 'cross-site' }))).toBe(true);
  });

  it('allows non-browser callers and the secret-protected revalidate hook', () => {
    expect(isCrossSiteMutation(req('POST'))).toBe(false);
    expect(isCrossSiteMutation(req('POST', { origin: 'https://evil.example' }, 'https://app.example.test/api/revalidate'))).toBe(false);
  });

  it('answers 403 and private caching through the middleware', async () => {
    const res = middleware(req('PATCH', { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    const ok = middleware(req('GET'));
    expect(ok.headers.get('cache-control')).toBe('private, no-store');
  });
});
