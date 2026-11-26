// Staging load test: signed-in customers using the dashboard, plus anonymous visitors.
//
//   k6 run -e BASE_URL=https://vah-api-staging.onrender.com -e ORIGIN=https://vah-new-frontend-75d6.vercel.app \
//          -e ACCOUNTS=40 -e DURATION=5m apps/backend/tests/k6/dashboard-load.js
//
// setup() creates ACCOUNTS synthetic customers through the normal sign-up route (addresses
// loadtest.*@example.test; sign-up sends no email). Each sign-up returns its own session, so no
// password is ever typed. Sign-up is limited to 60 per hour per client, so keep ACCOUNTS <= 55.
// Each signed-in customer repeats one dashboard visit (8 requests) every ~15 s, which stays under the
// per-user limit of 600 requests per 15 minutes. Accounts are not paid, so mail routes answer 403
// after the full access check (same database work as a paid customer, without the mail query).
// Never point this at production.
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'https://vah-api-staging.onrender.com';
const ORIGIN = __ENV.ORIGIN || 'https://vah-new-frontend-75d6.vercel.app';
const ACCOUNTS = Number(__ENV.ACCOUNTS || 40);
const DURATION = __ENV.DURATION || '5m';
if (/vah-api\.onrender\.com|virtualaddresshub\.co\.uk/.test(BASE)) throw new Error('Refusing to load-test production');

const dashboard = new Trend('dashboard_request_ms', true);
const limited = new Rate('rate_limited');

export const options = {
  setupTimeout: '5m',
  scenarios: {
    customers: { executor: 'constant-vus', vus: ACCOUNTS, duration: DURATION, exec: 'customer' },
    visitors: { executor: 'constant-arrival-rate', rate: 1, timeUnit: '2s', duration: DURATION, preAllocatedVUs: 2, exec: 'visitor' },
  },
  thresholds: {
    'http_req_failed{scenario:visitors}': ['rate<0.01'],
    dashboard_request_ms: ['p(95)<800'],
    rate_limited: ['rate<0.01'],
  },
};

function cookieHeader(jar) { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }
function absorb(jar, res) {
  for (const [name, list] of Object.entries(res.cookies || {})) if (list.length) jar[name] = list[0].value;
}

export function setup() {
  const stamp = Date.now();
  const sessions = [];
  for (let i = 0; i < ACCOUNTS; i++) {
    const jar = {};
    absorb(jar, http.get(`${BASE}/api/csrf`, { headers: { Origin: ORIGIN } }));
    const body = JSON.stringify({
      first_name: 'Load', last_name: `Test${i}`, email: `loadtest.${stamp}.${i}@example.test`, password: `Load!Test#${stamp}x${i}`,
      phone: '+447700900222', business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678',
      company_name: `Load Test ${i} Ltd`, forward_to_first_name: 'Load', forward_to_last_name: `Test${i}`, address_line1: '1 Test Street',
      city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB', billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0,
    });
    const res = http.post(`${BASE}/api/auth/signup`, body, { headers: {
      'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookieHeader(jar), 'X-CSRF-Token': decodeURIComponent(jar.vah_csrf_token || ''),
    } });
    absorb(jar, res);
    if (res.status !== 201 || !jar.vah_session) { console.error(`signup ${i}: ${res.status} ${String(res.body).slice(0, 120)}`); continue; }
    sessions.push(jar);
  }
  console.log(`created ${sessions.length} synthetic accounts`);
  return { sessions };
}

const VISIT = ['/api/auth/whoami', '/api/access', '/api/profile', '/api/profile/compliance', '/api/billing/overview',
  '/api/billing/invoices', '/api/mail-items', '/api/notifications'];

export function customer(data) {
  const jar = data.sessions[(exec.vu.idInTest - 1) % data.sessions.length];
  if (!jar) return sleep(15);
  const params = { headers: { Origin: ORIGIN, Cookie: cookieHeader(jar) }, tags: { kind: 'dashboard' } };
  for (const path of VISIT) {
    const res = http.get(`${BASE}${path}`, params);
    dashboard.add(res.timings.duration);
    limited.add(res.status === 429);
    check(res, { 'answered (not 5xx, not 429)': (r) => r.status < 500 && r.status !== 429 });
  }
  sleep(14 + Math.random() * 2);
}

export function visitor() {
  const h = http.get(`${BASE}/api/healthz`);
  const p = http.get(`${BASE}/api/plans`, { headers: { Origin: ORIGIN } });
  check(h, { 'health 200': (r) => r.status === 200 });
  check(p, { 'plans 200': (r) => r.status === 200 });
}
