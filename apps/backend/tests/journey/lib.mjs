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
