// Read-and-write smoke test used to compare one release against the database before and after the
// migration. Usage: node app_smoke.mjs <baseUrl> <label>  -> prints one line per check and writes
// /tmp/smoke-<label>.json. Local rehearsal only (dummy accounts from seed_render_like.sql).
import { writeFileSync } from 'node:fs';

const [base, label] = process.argv.slice(2);
const PW = 'Journey!Passw0rd#1';
const out = [];

async function login(email, password) {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.' + (out.length + 7) }, body: JSON.stringify({ email, password }) });
  const cookies = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]);
  const csrf = (cookies.find(c => c.startsWith('vah_csrf_token=')) || '').split('=')[1] || '';
  const json = await r.json().catch(() => null);
  return { status: r.status, cookie: cookies.join('; '), csrf, user: json?.data?.user };
}
async function call(who, s, method, path, body) {
  const r = await fetch(base + path, { method, headers: { cookie: s.cookie, 'x-csrf-token': s.csrf, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  const row = { who, check: `${method} ${path.replace(/\d+/g, ':id')}`, status: r.status, error: r.status >= 500 ? text.slice(0, 160) : undefined };
  out.push(row); console.log(String(row.status).padEnd(4), who.padEnd(9), row.check, row.error ? '  ' + row.error : '');
  try { return JSON.parse(text); } catch { return null; }
}

const admin = await login('admin@example.test', 'Local!Admin#2026');
out.push({ who: 'admin', check: 'login', status: admin.status }); console.log(admin.status, 'admin     login');
for (const email of ['rl.gocardless@example.test', 'rl.pending@example.test', 'rl.verified@example.test']) {
  const s = await login(email, PW); const who = email.split('@')[0].slice(3);
  out.push({ who, check: 'login', status: s.status }); console.log(s.status, who.padEnd(9), 'login');
  if (s.status !== 200) continue;
  await call(who, s, 'GET', '/api/auth/whoami');
  await call(who, s, 'GET', '/api/profile');
  const mail = await call(who, s, 'GET', '/api/mail-items');
  await call(who, s, 'GET', '/api/forwarding/requests');
  await call(who, s, 'GET', '/api/notifications');
  await call(who, s, 'GET', '/api/billing/overview');
  await call(who, s, 'GET', '/api/billing/invoices');
  await call(who, s, 'GET', '/api/account/businesses');
  const first = (mail?.data?.items || mail?.data || mail?.items || [])[0];
  if (first?.id) await call(who, s, 'GET', `/api/mail-items/${first.id}`);
}
const users = await call('admin', admin, 'GET', '/api/admin/users?page=1&pageSize=50');
const list = users?.items || users?.data?.items || users?.data?.users || users?.data || [];
for (const u of (Array.isArray(list) ? list : []).filter(u => String(u.email || '').startsWith('rl.')).slice(0, 4)) {
  await call('admin', admin, 'GET', `/api/admin/users/${u.id}`);
}
await call('admin', admin, 'GET', '/api/admin/mail-items');
await call('admin', admin, 'GET', '/api/admin/forwarding/requests');
await call('admin', admin, 'GET', '/api/admin/invoices');
await call('admin', admin, 'GET', '/api/admin/overview');
await call('admin', admin, 'GET', '/api/admin/plans');
// Writes the previous release makes on its own: an in-app notification (mail dispatched).
const items = await call('admin', admin, 'GET', '/api/admin/mail-items?limit=5');
const it = (items?.data?.items || items?.data || items?.items || [])[0];
if (it?.id) await call('admin', admin, 'POST', `/api/admin/mail-items/${it.id}/log-physical-dispatch`, { tracking_number: 'TRK1' });
writeFileSync(`/tmp/smoke-${label}.json`, JSON.stringify(out, null, 1));
