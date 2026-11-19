// Sign-in throttling: guessing is stopped, but a stranger cannot lock a customer out.
// Goes through the website (port 3000) so the visitor address is signed exactly as in normal use;
// visitors are simulated with x-forwarded-for (trusted locally only: VAH_CLIENT_IP_HEADER in local/frontend.env).
import crypto from 'node:crypto';
import { db, step, expect, report, API, ORIGIN } from './lib.mjs';

const WEB = process.env.JOURNEY_WEB || 'http://localhost:3000';
const pg = await db();
const PW = 'Journey!Passw0rd#1';
const stamp = Date.now().toString(36);
const net = crypto.randomInt(1, 250);
const ipFor = n => `198.18.${net}.${n}`;

/** A browser on one network address, with its own cookie jar. */
class Visitor {
  constructor(ip) { this.ip = ip; this.jar = new Map(); }
  async login(email, password, extra = {}) {
    const headers = { 'content-type': 'application/json', origin: WEB, 'x-forwarded-for': this.ip, ...extra };
    if (this.jar.size) headers.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(`${WEB}/api/bff/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email, password }) });
    for (const line of r.headers.getSetCookie?.() ?? []) { const [pair] = line.split(';'); const i = pair.indexOf('='); this.jar.set(pair.slice(0, i), pair.slice(i + 1)); }
    this.jar.delete('vah_session');
    return r.status;
  }
}

// A fresh customer for this run (created through the API; no direct database writes).
const email = `throttle.${stamp}@example.test`;
{
  const r = await fetch(`${API}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ email, password: PW, first_name: 'Throttle', last_name: 'Test', business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678', company_name: 'Throttle Ltd',
      forward_to_first_name: 'T', forward_to_last_name: 'T', address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB', billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0 }) });
  if (r.status >= 300) throw new Error(`signup ${r.status}`);
}
const customer = new Visitor(ipFor(1));

await step('T1', 'Customer signs in normally; their browser is remembered', async () => {
  expect((await customer.login(email, PW)) === 200, 'login failed'); expect(customer.jar.has('vah_device'), 'no device cookie');
});
await step('T2', 'Five wrong passwords from one address block that address for this account', async () => {
  const attacker = new Visitor(ipFor(66)); const seen = [];
  for (let i = 0; i < 7; i++) seen.push(await attacker.login(email, 'wrong-password'));
  expect(seen.slice(0, 5).every(s => s === 401) && seen.slice(5).every(s => s === 429), seen.join(','));
  expect((await attacker.login(email, PW)) === 429, 'the correct password got through while blocked');
  return seen.join(',');
});
await step('T3', 'The customer is not locked out by that attacker (same browser, and a new one elsewhere)', async () => {
  expect((await customer.login(email, PW)) === 200, 'remembered browser blocked');
  expect((await new Visitor(ipFor(2)).login(email, PW)) === 200, 'new browser on another address blocked');
});
await step('T4', 'Distributed guessing (50 failures from 10 addresses) stops unrecognised browsers', async () => {
  for (let v = 0; v < 10; v++) { const a = new Visitor(ipFor(100 + v)); for (let i = 0; i < 5; i++) await a.login(email, `guess-${v}-${i}`); }
  const st = await new Visitor(ipFor(3)).login(email, PW); expect(st === 429, `unrecognised browser got ${st}`);
});
await step('T5', 'The customer’s recognised browser still signs in during that block', async () => {
  const st = await customer.login(email, PW); expect(st === 200, `got ${st}`);
});
await step('T6', 'A wrong guess on a recognised browser does not lock it after one mistake', async () => {
  expect((await customer.login(email, 'typo')) === 401, 'typo not 401'); expect((await customer.login(email, PW)) === 200, 'locked after a typo');
});
await step('T7', 'A password reset lifts the block for new browsers', async () => {
  const r = await fetch(`${API}/api/profile/reset-password-request`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify({ email }) });
  expect(r.status < 300, `reset request ${r.status}`);
  let mail; // the email is sent just after the response, so allow a moment for it to arrive
  for (let i = 0; i < 20 && !mail; i++) { await new Promise(r => setTimeout(r, 250)); mail = (await pg.query(`SELECT model, body FROM local_email_outbox WHERE to_email=$1 AND template='password-reset-email' ORDER BY id DESC LIMIT 1`, [email])).rows[0]; }
  const link = JSON.stringify(mail ?? {}).match(/token=([A-Za-z0-9%._-]+)/); expect(link, 'no reset email in the outbox');
  const c = await fetch(`${API}/api/auth/reset-password/confirm`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ token: decodeURIComponent(link[1]), password: PW + 'x', confirmPassword: PW + 'x' }) });
  expect(c.status === 200, `confirm ${c.status} ${(await c.text()).slice(0, 120)}`);
  const st = await new Visitor(ipFor(4)).login(email, PW + 'x'); expect(st === 200, `after reset got ${st}`);
});
await step('T8', 'Unknown emails behave the same way (no hint that an account exists)', async () => {
  const a = new Visitor(ipFor(77)); const seen = [];
  for (let i = 0; i < 7; i++) seen.push(await a.login(`nobody.${stamp}@example.test`, 'wrong'));
  expect(seen.slice(0, 5).every(s => s === 401) && seen.slice(5).every(s => s === 429), seen.join(','));
});
await step('T9', 'Visitor headers sent by the browser are ignored (cannot pick their own address)', async () => {
  const a = new Visitor(ipFor(88)); const seen = [];
  for (let i = 0; i < 7; i++) seen.push(await a.login(email, 'wrong', { 'x-vah-client-ip': `203.0.113.${i}`, 'x-vah-client-sig': 'f'.repeat(64) }));
  expect(seen.slice(5).every(s => s === 429), seen.join(','));
});
await step('T10', 'Calling the API directly with a forged signed address does not reset the count', async () => {
  const seen = [];
  for (let i = 0; i < 7; i++) {
    const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-vah-client-ip': `203.0.113.${i}`, 'x-vah-client-sig': crypto.createHmac('sha256', 'not-the-secret').update(`203.0.113.${i}`).digest('hex') },
      body: JSON.stringify({ email: `direct.${stamp}@example.test`, password: 'wrong' }) });
    seen.push(r.status);
  }
  expect(seen.slice(5).every(s => s === 429), seen.join(','));
});
await pg.end();
process.exit(report() ? 0 : 1);
