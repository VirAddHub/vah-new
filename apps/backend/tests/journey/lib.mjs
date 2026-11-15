// Minimal journey-test helpers. No dependencies beyond `pg` (already a backend dependency).
// Runs against a locally started API. Refuses to run against anything that is not localhost.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client } = require('pg');

export const API = process.env.JOURNEY_API || 'http://127.0.0.1:4000';
export const ORIGIN = process.env.JOURNEY_ORIGIN || 'http://localhost:3000';
const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/vah_local';
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(API) || !/@(127\.0\.0\.1|localhost)[:/]/.test(DB_URL)) {
  console.error('REFUSING: journey tests only run against localhost.'); process.exit(2);
}

export async function db() { const c = new Client({ connectionString: DB_URL }); await c.connect(); return c; }

/** A browser-like session: keeps cookies, sends Origin, adds the CSRF token on writes. */
export class Session {
  constructor() { this.cookies = new Map(); }
  header() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';'); const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
      if (value === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(line)) this.cookies.delete(name); else this.cookies.set(name, value);
    }
  }
  async req(method, path, body, extraHeaders = {}) {
    const write = !['GET', 'HEAD'].includes(method);
    if (write && !this.cookies.has('vah_csrf_token')) await this.req('GET', '/api/csrf');
    const headers = { origin: ORIGIN, accept: 'application/json', ...extraHeaders };
    if (this.cookies.size) headers.cookie = this.header();
    if (write && this.cookies.has('vah_csrf_token')) headers['x-csrf-token'] = decodeURIComponent(this.cookies.get('vah_csrf_token'));
    let payload;
    if (body !== undefined) { headers['content-type'] ??= 'application/json'; payload = typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body); }
    const res = await fetch(API + path, { method, headers, body: payload, redirect: 'manual' });
    this.store(res);
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  get(p) { return this.req('GET', p); }
  post(p, b = {}) { return this.req('POST', p, b); }
  patch(p, b = {}) { return this.req('PATCH', p, b); }
}

const results = [];
export async function step(id, name, fn) {
  try { const note = await fn(); results.push({ id, name, status: 'PASS', note: note || '' }); }
  catch (e) { results.push({ id, name, status: e.pending ? 'PENDING' : 'FAIL', note: e.message }); }
}
export function expect(cond, msg) { if (!cond) throw new Error(msg); }
export function pending(reason) { const e = new Error(reason); e.pending = true; throw e; }
export function report() {
  const w = Math.max(...results.map(r => r.name.length));
  for (const r of results) console.log(`${r.status.padEnd(7)} ${r.id.padEnd(5)} ${r.name.padEnd(w)}  ${r.note}`);
  const count = s => results.filter(r => r.status === s).length;
  console.log(`\n${count('PASS')} passed, ${count('FAIL')} failed, ${count('PENDING')} pending (not yet implemented)`);
  return count('FAIL') === 0;
}

// ---- Provider simulators (mock tests: these are NOT provider-sandbox tests) --------------------
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../local/backend.env');
export const ENV = Object.fromEntries(
  (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').split('\n')
    .map(l => l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));

let seq = 0;
export const uid = p => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${crypto.randomBytes(3).toString('hex')}`;

/** Build a Stripe event. `created` is in seconds, as Stripe sends it. */
export function stripeEvent(type, object, { id = uid('evt'), created = Math.floor(Date.now() / 1000) } = {}) {
  return { id, object: 'event', type, created, data: { object } };
}
/** Deliver an event to the webhook exactly as Stripe would: raw JSON body, signed header. */
export async function sendStripe(event, { badSignature = false } = {}) {
  const body = JSON.stringify(event), t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', badSignature ? 'wrong' : ENV.STRIPE_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  const res = await fetch(API + '/api/webhooks/stripe', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body });
  return { status: res.status, json: await res.json().catch(() => null) };
}
export async function sendSumsub(payload, { badSignature = false } = {}) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', badSignature ? 'wrong' : ENV.SUMSUB_WEBHOOK_SECRET).update(body).digest('hex');
  const res = await fetch(API + '/api/webhooks/sumsub', { method: 'POST', headers: { 'content-type': 'application/json', 'x-payload-digest': sig, 'x-payload-digest-alg': 'HMAC_SHA256_HEX' }, body });
  return { status: res.status, json: await res.json().catch(() => null) };
}
export const sumsubReview = (externalUserId, answer, extra = {}) => ({
  type: 'applicantReviewed', applicantId: `app_${externalUserId}`, externalUserId: String(externalUserId), reviewStatus: 'completed',
  reviewResult: { reviewAnswer: answer, ...extra }, createdAtMs: new Date().toISOString(),
});
export async function importMail(body) {
  const res = await fetch(API + '/api/internal/from-onedrive', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mail-import-secret': ENV.MAIL_IMPORT_WEBHOOK_SECRET }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
export async function setScanUrl(mailId, scanFileUrl) {
  const res = await fetch(API + `/api/internal/from-onedrive/${mailId}/scan-url`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-mail-import-secret': ENV.MAIL_IMPORT_WEBHOOK_SECRET }, body: JSON.stringify({ scanFileUrl }) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
/** A tiny local server that plays the part of scan storage and serves one PDF. */
export const TEST_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
export function startPdfServer(port = 4011) {
  const server = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'application/pdf', 'content-length': TEST_PDF.length }); r.end(TEST_PDF); });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${port}/scan.pdf`, close: () => server.close() })));
}
/** Stripe objects for one customer's subscription, sharing ids like a real checkout does. */
export function stripeFixture(userId, planId, period = 'monthly') {
  const customer = uid('cus'), subscription = uid('sub');
  const metadata = { userId: String(userId), planId: String(planId), billingPeriod: period };
  const price = period === 'annual' ? ENV.STRIPE_PRICE_ID_ANNUAL : ENV.STRIPE_PRICE_ID_MONTHLY;
  const now = Math.floor(Date.now() / 1000), len = period === 'annual' ? 365 * 86400 : 30 * 86400;
  return {
    customer, subscription, metadata,
    checkout: (o = {}) => ({ id: uid('cs'), object: 'checkout.session', mode: 'subscription', payment_status: 'paid', customer, subscription, metadata, ...o }),
    sub: (status = 'active', o = {}) => ({ id: subscription, object: 'subscription', status, customer, cancel_at_period_end: false, metadata, items: { data: [{ price: { id: price } }] }, ...o }),
    invoice: (o = {}) => ({ id: uid('in'), object: 'invoice', customer, subscription, amount_paid: period === 'annual' ? 8999 : 999, currency: 'gbp', payment_intent: uid('pi'),
      subscription_details: { metadata }, lines: { data: [{ period: { start: o.start ?? now, end: o.end ?? now + len }, price: { id: price } }] }, ...o }),
  };
}
