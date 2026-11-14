# Audit evidence, 14 November 2026

Everything here was produced in an isolated sandbox against a local Postgres with dummy `@example.test` accounts.
No production service, real customer record or real credential was used. All secrets in `env/` are dummy values.

| Path | What it is |
|---|---|
| `AUDIT-REPORT.md` | The full audit, ranked fixes, redesign proposal and phased plan (export of the shared doc) |
| `CHECKLIST.md` | Every backend route (213), proxy route (122) and page opened (45) with a Done box, what the audit saw, and the fix number |
| `inventory/` | Raw route inventories: `be_routes.txt` (method, path, guards), `fe_routes.txt` (proxy route, methods, backend target) |
| `scripts/journeys/` | `t1.py`–`t7.py` journey scripts and `lib.py`. Run with Python 3 + requests against API :4000 and site :3000 |
| `scripts/tools/` | `shot.cjs` (screenshots + axe + SEO), `anon.cjs` (redirects, mobile menu), `routes.cjs` (route inventory), `heal.cjs` (see below), `mkchecklist.py`, `restart-be.sh` |
| `screenshots/` | 68 files: PNG per page view plus the JSON reports (`pub_d`, `pub_m`, `dash_d`, `dash_m`, `adm_d`, `adm2`) |
| `logs/` | Backend and frontend logs, Vitest/Jest/ESLint output, build logs, `schema-heal.log`, `sandbox-patches.log`, migration apply list, sandbox user table |
| `patches/dist-patches.diff` | The two temporary code patches, as a diff of compiled output (never applied to source) |
| `patches/reconstructed-schema.sql` | Schema of the sandbox database. **Not** the production schema: see caveat 3 |
| `env/` | The dummy environment used for the backend and the site |

## Caveats: results that depended on a workaround

A result in the report marked "Verified" means it behaved correctly **in the patched sandbox**. Each workaround below
maps to a real fix; until that fix lands and the check is re-run without the workaround, treat the result as provisional.

### 1. Manual account activation  →  fixes 4, 5, 6
New accounts never become active through the app, so test customers (ids 9 and 10) were activated by hand in the
database: `status='active'`, `plan_id=1`, a `subscription` row with a fake mandate id, and a `business` row
(created through the API for user 9).

Depends on this: every check performed as a logged-in customer after signup — login/logout round trip, dashboard pages
and screenshots (`dash_d`, `dash_m`), mail list/detail/tag/archive/restore/search, forwarding request, billing overview and
invoices, certificate, business create/list, business owners, support tickets, settings, email change, the
customer-to-customer isolation tests (t7), and the mail import (needs the business row).

### 2. Subscription check narrowed ("Patch A")  →  fix 3
`requireActiveSubscription` was limited to `/mail-items` and `/tags` in the compiled backend.

Depends on this: contact form, compliance quiz, Companies House / address lookup reachability, KYC start, support,
Stripe publishable key and checkout reachability, internal cron endpoints, mail import endpoint, OneDrive webhook
reachability, and unknown routes returning 404. Unpatched, all of these return 401 to anyone without an active subscription.

### 3. Database columns and tables added outside the migrations  →  fixes 7, 8, 16
The migrations do not build an empty database. The sandbox schema was assembled from four SQL folders plus repair scripts,
then `heal.cjs` added any column the code asked for at run time. Column **types** chosen by `heal.cjs` are guesses.

Added columns (35 distinct):

- `blog_posts.cover` (added as text)
- `blog_posts.date` (added as text)
- `blog_posts.description` (added as text)
- `blog_posts.noindex` (added as text)
- `blog_posts.og_desc` (added as text)
- `blog_posts.og_title` (added as text)
- `blog_posts.tags` (added as text)
- `blog_posts.updated` (added as text)
- `invoices.billing_interval` (added as text)
- `mail_item.item_id` (added as text)
- `user.address_line1` (added as text)
- `user.address_line2` (added as text)
- `user.billing` (added as text)
- `user.business_type` (added as text)
- `user.city` (added as text)
- `user.company_name` (added as text)
- `user.country` (added as text)
- `user.country_of_incorporation` (added as text)
- `user.expires_at` (added as bigint)
- `user.forward_country` (added as text)
- `user.forward_to_first_name` (added as text)
- `user.forward_to_last_name` (added as text)
- `user.is_staff` (added as boolean)
- `user.password_hash` (added as text)
- `user.phone` (added as text)
- `user.postal_code` (added as text)
- `user.postcode` (added as text)
- `user.price` (added as text)
- `user.reset_token_expires_at` (added as bigint)
- `user.reset_token_hash` (added as text)
- `user.reset_token_used_at` (added as bigint)
- `user.subscription_status` (added as text)
- `user.suspended_at` (added as bigint)
- `webhook_log.error` (added as text)
- `webhook_log.type` (added as text)

Retyped by hand: `user.suspended_at` and `user.reset_token_expires_at` (bigint → timestamptz).
Tables the code uses that nothing creates (left missing): `notification`, `mail_audit`, `forward_audit`.

Depends on this: signup and profile (several `user` columns), password reset, blog, invoices, mail import (`mail_item.item_id`),
admin user list. Failures attributed to date types (admin create user, plan edit, GDPR export, blog create) are
**schema-dependent**: they must be re-tested against the real schema.

### 4. Rate limits  →  fix 10
The auth limiter was raised from 30 to 100000 from the start. From the second run of `t5.py` onward the backend ran with
`DISABLE_RATE_LIMIT=1` after the 200-per-user limit was exhausted by one screenshot pass.

Depends on this: every scripted journey (t1–t7) and all dashboard/admin screenshots.

### Not dependent on any workaround
Signup validation, wrong-password handling, Stripe / Sumsub / mail-import signature and secret checks, CSRF rejection,
customer-to-admin 403s, all public page rendering, SEO-tag and accessibility findings, the placeholder-content findings,
the profile-save secret leak, and every "Broken" result that describes behaviour of the unpatched app.

## Reproducing
1. Build the backend, start Postgres, load `patches/reconstructed-schema.sql` (or, after Phase 1, run the migrations).
2. Start the backend with `env/backend.sandbox-env.txt` (add `-r scripts/tools/heal.cjs` only when reproducing the audit as it was).
3. Start the site with `env/frontend.sandbox-env.txt`.
4. `python3 scripts/journeys/t1.py` … `t7.py`; `node scripts/tools/shot.cjs <prefix> 1440x900 [--login email pw] <urls>`.

## Corrections after publication

- The report first said the journey scripts "exercised 212 backend routes". The server log shows 117 of 213 backend routes and 48 of 122 proxy routes were called; the rest are marked "not called" in CHECKLIST.md.
- Scan viewing was listed as incomplete because the test item had no scan link. That was a gap in the test (the worker sets the link in a second call that was not simulated), not an app fault.
- Phase 0 report and the Phase 1 change proposal: https://claude.ai/artifact/LQus3pSBsER9ZBMy6VGXjM
