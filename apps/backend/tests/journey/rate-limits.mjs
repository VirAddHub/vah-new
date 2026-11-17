// Rate limits, at the shipping values. Run LAST: it deliberately exhausts the failed-login allowance
// for this address for 15 minutes (restart the API to clear it locally).
import crypto from 'node:crypto';
import { Session, db, step, expect, report, API, ORIGIN } from './lib.mjs';
const WEB = process.env.JOURNEY_WEB || 'http://localhost:3000';
const net = crypto.randomInt(1, 250);
// Visitors are simulated with x-forwarded-for through the website (trusted locally only; see local/frontend.env).
const web = (path, ip, init = {}) => fetch(WEB + path, { ...init, headers: { 'content-type': 'application/json', origin: WEB, 'x-forwarded-for': ip, ...(init.headers || {}) } }).then(r => r.status);
const post = (path, body, headers = {}) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: JSON.stringify(body) }).then(r => r.status);

await step('L1', 'The session check is never rate limited (200 calls)', async () => {
  const s = new Session(); let limited = 0;
  for (let i = 0; i < 200; i++) if ((await s.get('/api/auth/whoami')).status === 429) limited++;
  expect(limited === 0, `${limited} of 200 session checks were limited`);
});
await step('L2', 'Successful logins are not counted (40 in a row)', async () => {
  for (let i = 0; i < 40; i++) { const st = await post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' }); expect(st === 200, `login ${i + 1} returned ${st}`); }
});
await step('L3', 'Guessing across many accounts from one address is stopped after 30 failures', async () => {
  // Different (unknown) emails each time, so the per-account throttle (login-throttle.mjs) never applies.
  const seen = []; for (let i = 0; i < 40; i++) seen.push(await post('/api/auth/login', { email: `spray${i}.${Date.now()}@example.test`, password: 'wrong-password' }));
  const firstBlock = seen.indexOf(429); expect(firstBlock > 0 && firstBlock <= 30, `first 429 at attempt ${firstBlock + 1}`); expect(seen.slice(firstBlock).every(x => x === 429), 'limit did not hold');
  return `blocked from attempt ${firstBlock + 1}`;
});
await step('L4', 'A forged visitor-address header does not escape the limit', async () => {
  const st = await post('/api/auth/login', { email: 'admin@example.test', password: 'wrong-password' }, { 'x-vah-client-ip': '203.0.113.9', 'x-vah-client-sig': 'deadbeef' });
  expect(st === 429, `forged header got ${st}`);
});
await step('L5', 'Contact form: 5 per visitor per 15 minutes; another visitor is unaffected', async () => {
  const body = JSON.stringify({ name: 'A Visitor', email: 'visitor@example.test', subject: 'Hello', message: 'A question about the service.', inquiryType: 'general' });
  const a = []; for (let i = 0; i < 7; i++) a.push(await web('/api/bff/contact', `198.19.${net}.1`, { method: 'POST', body }));
  expect(a.slice(0, 5).every(x => x < 400) && a.slice(5).every(x => x === 429), `visitor A: ${a.join(',')}`);
  const b = await web('/api/bff/contact', `198.19.${net}.2`, { method: 'POST', body }); expect(b < 400, `visitor B got ${b}`);
  return a.join(',');
});
await step('L6', 'Anonymous browsing: one visitor using up 500 requests does not block another', async () => {
  let first429 = -1;
  for (let i = 0; i < 520 && first429 < 0; i++) if ((await web('/api/bff/auth/whoami', `198.19.${net}.3`)) === 429) first429 = i + 1;
  expect(first429 > 480, `visitor A limited at request ${first429}`);
  const b = await web('/api/bff/auth/whoami', `198.19.${net}.4`); expect(b === 401, `visitor B got ${b}`);
  return `visitor A limited at request ${first429}`;
});
await step('L7', 'Payment-provider callbacks are not subject to visitor limits (60 in a row)', async () => {
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add((await fetch(`${API}/api/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' }, body: '{}' })).status);
  expect(!seen.has(429), `statuses ${[...seen]}`); return `statuses ${[...seen]}`;
});
await step('L8', 'Password reset: at most 3 emails per address per hour, same reply every time', async () => {
  const pg = await db(); const email = 'admin@example.test';
  const before = Number((await pg.query(`SELECT COUNT(*)::int n FROM local_email_outbox WHERE to_email=$1 AND template='password-reset-email'`, [email])).rows[0].n);
  const st = []; for (let i = 0; i < 5; i++) st.push(await web('/api/profile/reset-password-request', `198.19.${net}.${10 + i}`, { method: 'POST', body: JSON.stringify({ email }) }));
  await new Promise(r => setTimeout(r, 3000));
  const sent = Number((await pg.query(`SELECT COUNT(*)::int n FROM local_email_outbox WHERE to_email=$1 AND template='password-reset-email'`, [email])).rows[0].n) - before;
  await pg.end();
  expect(st.every(x => x === 200), `replies ${st.join(',')}`); expect(sent <= 3, `${sent} emails sent`);
  return `${sent} emails for 5 requests`;
});
process.exit(report() ? 0 : 1);
