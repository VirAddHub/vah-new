import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { csrfHeaderFromCookie } from '../lib/server/backendMutationHeaders';

// The API requires X-CSRF-Token (matching the vah_csrf_token cookie) on every state-changing request
// from a signed-in browser. A website route that forwards the browser's cookie on a POST/PUT/PATCH/
// DELETE without that header is refused with 403 (seen on staging: sign-out, identity checks).
function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routeFiles(p) : e.name === 'route.ts' ? [p] : [];
  });
}

// The API skips CSRF for these paths (middleware/csrf.ts): signing in and signing up.
const EXEMPT = new Set(['bff/auth/login/route.ts', 'bff/auth/signup/route.ts']);

describe('website API routes forward the CSRF token on signed-in writes', () => {
  const root = path.join(__dirname, '..', 'app', 'api');
  const offenders = routeFiles(root).filter(f => {
    const src = fs.readFileSync(f, 'utf8');
    const writes = /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/.test(src);
    const forwardsCookie = /['"]?[Cc]ookie['"]?\s*:\s*\w/.test(src);
    const handlesCsrf = /csrfHeaderFromCookie|buildBackendMutationHeaders|x-csrf-token|_lib\/proxy/i.test(src);
    return writes && forwardsCookie && !handlesCsrf;
  }).map(f => path.relative(root, f)).filter(f => !EXEMPT.has(f));

  it('no route forwards a session cookie on a write without the CSRF header', () => {
    expect(offenders).toEqual([]);
  });

  it('reads the token from the browser cookie', () => {
    expect(csrfHeaderFromCookie('a=1; vah_csrf_token=abc%3D; vah_session=s')).toEqual({ 'X-CSRF-Token': 'abc=' });
    expect(csrfHeaderFromCookie('vah_session=s')).toEqual({});
  });
});
