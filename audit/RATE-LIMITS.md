# Rate limits and sign-in throttling (17 Nov 2026)

## How the visitor is identified
- The website signs each visitor's address (`x-vah-client-ip` + HMAC with `BFF_SHARED_SECRET`) on **every**
  server-side call to the API (`lib/server/visitorFetch.ts`, installed from `instrumentation.ts` and re-checked by
  `getBackendOrigin()`; `proxy.ts` and a few routes also set it explicitly). The API trusts it only if the signature
  is valid (`server/lib/clientKey.ts`); otherwise it uses `req.ip`.
- Which incoming header the website trusts: `x-real-ip` on Vercel (set by Vercel, not the browser), or
  `VAH_CLIENT_IP_HEADER`. Locally `x-forwarded-for` is trusted so tests can simulate visitors: **never** set that on a
  host that passes the browser's own header through. Unknown host + no setting = nothing sent (all visitors share one
  allowance: safe but strict).
- API side: `trust proxy 1`, so `req.ip` is the address added by Render's proxy. Calling the API directly with a
  forged `x-forwarded-for` only works where nothing sits in front of the API (local).
- Browser-supplied `x-vah-client-*` headers are dropped by the website and ignored by the API unless correctly signed (tested: L4, T9, T10).

## Limits (all per 15 minutes unless stated)
| Scope | Key | Limit | Notes |
|---|---|---|---|
| Anonymous requests | visitor | 500 | Skipped when a session cookie is present (then the per-account limit applies) |
| Signed-in requests | account (visitor if the session is invalid) | 600; admins 1,500 | Admin dashboard polls several panels |
| Failed sign-ins, all accounts | visitor | 30 failures | Successes not counted |
| Sign-in per account | see below | | Replaces the old 5-strikes account lock |
| Sign-up | visitor | 60 / hour | |
| Password reset request | visitor 5; email address 3 / hour | | Same reply when limited (no account enumeration) |
| Contact form | visitor | 5 | Was shared by the whole site before this change |
| Companies House search / details | visitor | 60 / 5 min | Now goes through the API (cached); was unlimited and called Companies House directly |
| Provider callbacks, mail-import worker | source | 600 / min | Not subject to visitor limits; authenticated by signatures/secrets |
| Existing operation limits | account | forwarding 35, mail forward 20, KYC writes 25, checkout 15, billing 180, invoice PDFs 40/h, admin panels | Fallback key fixed to the visitor (was the website server) |
| Static/cached pages (blog, plans) | n/a | n/a | Served from the website's cache; do not reach the API |

## Sign-in throttling (replaces the account lockout)
Five wrong passwords used to lock the account for everyone for 15 minutes, so anyone who knew a customer's email could
keep them out. Now (`services/loginThrottle.ts`, table `login_throttle`):
- **Per account + source:** 5 failures from one address lock that address out of that account for 15 minutes.
- **Recognised devices** (signed `vah_device` cookie set on successful sign-in) have their own allowance (10), so
  failures elsewhere never block them.
- **Distributed guessing:** 50 failures across all unrecognised sources in 24 h block unrecognised devices for 1 hour.
  Recognised devices are unaffected; a password reset or the admin "Clear sign-in block" lifts it.
- Unknown emails are counted the same way (no hint that an account exists).
- Tested: `tests/journey/login-throttle.mjs` (10 checks), including an attacker failing repeatedly while the customer signs in.

## Not covered / follow-up
- Ideal Postcodes key is given to the browser by design (browser keys); restrict it to your domains in the Ideal Postcodes dashboard.
- In-memory counters reset when the API restarts and are per instance (one instance today). A shared store is needed if the API is scaled out. Sign-in throttling is in Postgres and is unaffected.
- `routes/password-reset.ts`, `routes/profile/password-reset.ts`, `routes/profile/reset-password-request.ts` and `routes/profile.password-reset.ts` are not mounted (dead code); limits there were updated for consistency only.
