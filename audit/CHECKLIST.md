# Feature checklist: every route, proxy route and page

Generated from the audit inventory by `scripts/tools/mkchecklist.py`. Tick the **Done** box when a route has a passing automated test on a migration-built database with rate limits enabled and no manual data fixes. Until then the "Audit" column records only what the 2026-11-14 audit saw in the patched sandbox (see README for the caveats).

Fix numbers refer to the ranked fixes in `AUDIT-REPORT.md`. "not called" means no audit script hit that route; it is neither passed nor failed.

## Progress log

| Date | Milestone | Journey test | Unit tests |
|---|---|---|---|
| 2026-11-15 | Baseline + migrations, subscription check per route, business at signup | 9 pass, 0 fail, 8 pending (migration-built db, rate limits on, no manual activation) | 231 pass, 14 fail (unchanged from audit) |
| 2026-11-15 | Access decision, restricted mail, Stripe event safety and activation, unpaid login, forwarding fixes, rate limits | journey 30 pass, 1 pending (real Stripe checkout); stripe-events 16 pass; rate-limits 4 pass. All mock tests | 231 pass, 14 fail (unchanged) |

Ticked so far: routes proven by the journey test under the stated conditions. Ticks from mock tests are provisional until the provider-sandbox run. Journey steps 1.5-1.9 also show that checkout, verification start, support, billing overview and company search are reachable before payment and that mail, tags and forwarding answer 403; those routes stay unticked until their full behaviour is tested.

**Backend routes:** 213 total, 117 exercised in the audit, 96 not called.

## Backend routes

### Accounts (13)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/auth/debug-env` | devOnly | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/auth/debug-update-password` | devOnly | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/auth/debug-user/:email` | devOnly | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [x] | POST | `/api/auth/login` | none | 200, 401, 429 | Rejects pending_payment users | 5 |
| [x] | POST | `/api/auth/logout` | none | 200, 403, 429 |  |  |
| [ ] | POST | `/api/auth/reset-password/confirm` | none | 400, 500 |  |  |
| [ ] | POST | `/api/auth/reset-password/request` | none | 200 |  |  |
| [x] | POST | `/api/auth/signup` | none | 201, 400, 409, 429 | No business row created | 6 |
| [ ] | GET | `/api/auth/test-db` | devOnly | not called |  |  |
| [ ] | POST | `/api/auth/test-email` | devOnly | not called |  |  |
| [ ] | GET | `/api/auth/test-user-table` | devOnly | not called |  |  |
| [ ] | GET | `/api/auth/user-table-schema` | devOnly | not called |  |  |
| [x] | GET | `/api/auth/whoami` | none | 200, 401, 429, 500 |  |  |

### Accounts / dashboard (17)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/profile` | requireAuth | 200, 401 |  |  |
| [ ] | PATCH | `/api/profile` | requireAuth | 200, 403, 429 | Response leaks password hash (S1) | 11 |
| [ ] | GET | `/api/profile/certificate` | requireAuth | 200, 429 |  |  |
| [ ] | GET | `/api/profile/certificate-url` | requireAuth | 200, 401, 429 |  |  |
| [ ] | GET | `/api/profile/ch-verification` | requireAuth | not called |  |  |
| [ ] | POST | `/api/profile/ch-verification` | requireAuth | not called |  |  |
| [ ] | PATCH | `/api/profile/company-details` | requireAuth | not called |  |  |
| [ ] | GET | `/api/profile/compliance` | requireAuth | 200, 401 |  |  |
| [ ] | GET | `/api/profile/confirm-email-change` | none | 200 |  |  |
| [ ] | PATCH | `/api/profile/contact` | requireAuth | 200, 429 | Email change without password (S2) | 11 |
| [ ] | PATCH | `/api/profile/controllers` | requireAuth | not called |  |  |
| [ ] | POST | `/api/profile/email-change/resend` | none | 200 |  |  |
| [ ] | GET | `/api/profile/me` | requireAuth | not called |  |  |
| [ ] | PATCH | `/api/profile/me` | requireAuth | 400, 429 |  |  |
| [ ] | GET | `/api/profile/media/ch-verification/:filename` | requireAuth | not called |  |  |
| [ ] | GET | `/api/profile/registered-office-address` | requireAuth | 200, 401, 403, 429 |  |  |
| [ ] | POST | `/api/profile/reset-password-request` | none | not called |  |  |

### Administration (69)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/admin-audit` | none | 200, 403 |  |  |
| [ ] | GET | `/api/admin-audit/mail-audit` | none | 503 |  |  |
| [ ] | GET | `/api/admin-forward-audit` | none | 200, 403 |  |  |
| [ ] | POST | `/api/admin-repair/backfill-expiry` | requireAdmin* | not called |  |  |
| [ ] | POST | `/api/admin-repair/fts` | requireAdmin* | not called |  |  |
| [ ] | POST | `/api/admin-repair/fts/rebuild` | requireAdmin* | not called |  |  |
| [ ] | GET | `/api/admin/activity` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/blog/categories` | requireAdmin | 500 |  |  |
| [ ] | GET | `/api/admin/blog/posts` | requireAdmin | 200, 403 |  |  |
| [ ] | POST | `/api/admin/blog/posts` | requireAdmin | 500 | Fails on reconstructed schema | 7 |
| [ ] | DELETE | `/api/admin/blog/posts/:slug` | requireAdmin | 404 |  |  |
| [ ] | GET | `/api/admin/blog/posts/:slug` | requireAdmin | not called |  |  |
| [ ] | PUT | `/api/admin/blog/posts/:slug` | requireAdmin | 404 |  |  |
| [ ] | POST | `/api/admin/blog/upload` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/ch-verification/:userId/approve` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/ch-verification/:userId/reject` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/ch-verification/submissions` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/exports/destruction-log` | requireAdmin*,requireAdmin | 200, 403 |  |  |
| [ ] | POST | `/api/admin/forwarding/complete` | requireAdmin* | not called |  |  |
| [ ] | GET | `/api/admin/forwarding/locks` | requireAdmin | 200, 403 |  |  |
| [x] | GET | `/api/admin/forwarding/requests` | requireAdmin*,adminListForwarding | 200, 403 |  |  |
| [ ] | DELETE | `/api/admin/forwarding/requests/:id` | requireAdmin*,requireAdmin | not called |  |  |
| [x] | PATCH | `/api/admin/forwarding/requests/:id` | requireAdmin*,adminUpdateForwarding | 400 |  |  |
| [ ] | GET | `/api/admin/forwarding/requests/:id/debug-status` | requireAdmin | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/admin/forwarding/requests/:id/force-unlock` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/forwarding/requests/:id/lock` | requireAdmin | 400 | Admin identity from body (S3) | 13 |
| [ ] | GET | `/api/admin/forwarding/requests/:id/lock-status` | requireAdmin | 200 |  |  |
| [ ] | POST | `/api/admin/forwarding/requests/:id/status` | requireAdmin* | 200, 400 |  |  |
| [ ] | POST | `/api/admin/forwarding/requests/:id/unlock` | requireAdmin | 404 |  |  |
| [ ] | GET | `/api/admin/forwarding/stats` | requireAdmin* | not called |  |  |
| [ ] | POST | `/api/admin/generate-invoice` | requireAdmin* | 400 |  |  |
| [ ] | GET | `/api/admin/gocardless` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/health/dependencies` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/health/summary` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/invoices` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/invoices/:id` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/invoices/:id/download` | requireAdmin | 200 |  |  |
| [ ] | GET | `/api/admin/mail-items` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/mail-items/:id` | requireAdmin | 200 |  |  |
| [ ] | PUT | `/api/admin/mail-items/:id` | requireAdmin | 200 |  |  |
| [ ] | POST | `/api/admin/mail-items/:id/log-physical-dispatch` | requireAdmin | 500 | Missing notification table | 16 |
| [ ] | POST | `/api/admin/mail-items/:id/mark-destroyed` | requireAdmin | 400 |  |  |
| [ ] | POST | `/api/admin/mail-items/bulk` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/mail-items/test-excel-write` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/media/blog/:filename` | none | not called |  |  |
| [ ] | GET | `/api/admin/metrics/growth` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/onedrive` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/overview` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/plans` | requireAdmin | 200, 403 |  |  |
| [ ] | POST | `/api/admin/plans` | requireAdmin | 201, 403 |  |  |
| [ ] | DELETE | `/api/admin/plans/:id` | requireAdmin | 200 |  |  |
| [ ] | GET | `/api/admin/plans/:id` | requireAdmin | not called |  |  |
| [ ] | PATCH | `/api/admin/plans/:id` | requireAdmin | 500 | Date type mismatch | 8 |
| [ ] | GET | `/api/admin/postmark` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/recalculate-invoice` | requireAdmin* | not called |  |  |
| [ ] | POST | `/api/admin/repair-orphan-charges` | requireAdmin* | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/admin/stats` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/sumsub` | requireAdmin | 200, 403 |  |  |
| [ ] | GET | `/api/admin/users` | requireAdmin | 200, 401, 403 |  |  |
| [ ] | POST | `/api/admin/users` | requireAdmin | 500 | Date type mismatch on create | 8 |
| [ ] | DELETE | `/api/admin/users/:id` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/users/:id` | requireAdmin | 200 |  |  |
| [ ] | PATCH | `/api/admin/users/:id` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/users/:id/restore` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/users/:id/send-password-reset` | requireAdmin | not called |  |  |
| [ ] | POST | `/api/admin/users/:id/unlock-account` | requireAdmin | not called |  |  |
| [ ] | GET | `/api/admin/users/deleted` | requireAdmin | 200 |  |  |
| [ ] | GET | `/api/admin/users/search` | requireAdmin | 200 |  |  |
| [ ] | GET | `/api/admin/users/stats` | requireAdmin | 200 |  |  |

### Background jobs (5)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | POST | `/api/internal/billing/generate-invoices` | none | 401 | No scheduler calls these | 17 |
| [ ] | POST | `/api/internal/billing/run` | none | 401 | No scheduler calls these | 17 |
| [ ] | GET | `/api/internal/daily-summary` | none | 401 | No scheduler calls these | 17 |
| [x] | POST | `/api/internal/from-onedrive` | none | 200, 401, 500 | No scheduler calls these | 17 |
| [ ] | PATCH | `/api/internal/from-onedrive/:mailId/scan-url` | none | not called | No scheduler calls these | 17 |

### Billing (20)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | POST | `/api/billing/cancel` | requireAuth | not called |  |  |
| [ ] | POST | `/api/billing/change-plan` | requireAuth | not called |  |  |
| [ ] | GET | `/api/billing/invoices` | requireAuth | 200, 401, 403, 429 |  |  |
| [ ] | GET | `/api/billing/invoices/:id` | requireAuth | 404 |  |  |
| [ ] | GET | `/api/billing/invoices/:id/download` | requireAuth | 403 |  |  |
| [ ] | GET | `/api/billing/overview` | requireAuth | 200, 401, 403, 429 |  |  |
| [ ] | POST | `/api/billing/payment-methods/complete-setup` | requireAuth | not called |  |  |
| [ ] | POST | `/api/billing/payment-methods/setup-intent` | requireAuth | not called |  |  |
| [ ] | POST | `/api/billing/reauthorise` | requireAuth | not called |  |  |
| [ ] | POST | `/api/billing/retry-payment` | requireAuth | not called |  |  |
| [ ] | POST | `/api/billing/update-bank` | requireAuth | 429, 500 | GoCardless-only; no Stripe portal | 15 |
| [ ] | GET | `/api/payments/capabilities` | none | 200, 401 |  |  |
| [ ] | POST | `/api/payments/redirect-flows` | requireAuth | 403 |  |  |
| [ ] | POST | `/api/payments/stripe/checkout-session` | requireAuth | 429, 500 | Blocked by subscription check for new users | 3 |
| [ ] | POST | `/api/payments/stripe/checkout-session-embedded` | requireAuth | 403, 500 | Blocked by subscription check for new users | 3 |
| [x] | GET | `/api/payments/stripe/publishable-key` | none | 200, 401, 403, 429, 503 |  |  |
| [ ] | GET | `/api/payments/stripe/session-status` | requireAuth | not called | Not scoped to owner (S6) | 13 |
| [ ] | POST | `/api/payments/subscriptions` | requireAuth | not called |  |  |
| [ ] | GET | `/api/payments/subscriptions/status` | requireAuth | 200, 429 |  |  |
| [ ] | GET | `/api/plans` | none | 200 |  |  |

### Dashboard (12)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/account/businesses` | requireAuth | 200, 401 |  |  |
| [ ] | POST | `/api/account/businesses` | requireAuth | 201 |  |  |
| [ ] | GET | `/api/account/businesses/:businessId` | requireAuth | not called |  |  |
| [ ] | PATCH | `/api/account/businesses/:businessId` | requireAuth | not called |  |  |
| [ ] | POST | `/api/account/businesses/:businessId/set-primary` | requireAuth | not called |  |  |
| [ ] | GET | `/api/downloads/export/:token` | none | not called |  |  |
| [ ] | GET | `/api/email-prefs` | requireAuth | 200, 429 |  |  |
| [ ] | POST | `/api/email-prefs` | requireAuth | 200, 429 |  |  |
| [ ] | POST | `/api/gdpr-export/export/request` | none | 429, 500 | Date type mismatch | 8 |
| [ ] | GET | `/api/gdpr-export/export/status` | none | 200, 429 |  |  |
| [ ] | GET | `/api/notifications` | none | 401 | Missing notification table | 16 |
| [ ] | POST | `/api/notifications/mark-read` | none | not called | Missing notification table | 16 |

### Mail (15)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [x] | GET | `/api/mail-items` | requireActiveSubscription*,requireAuth | 200, 401, 403 |  |  |
| [ ] | DELETE | `/api/mail-items/:id` | requireActiveSubscription*,requireAuth | 200 |  |  |
| [x] | GET | `/api/mail-items/:id` | requireActiveSubscription*,requireAuth | 200, 403, 404 |  |  |
| [ ] | PATCH | `/api/mail-items/:id` | requireActiveSubscription*,requireAuth | 200, 404 |  |  |
| [ ] | GET | `/api/mail-items/:id/download` | requireActiveSubscription*,requireAuth | 400, 404 |  |  |
| [ ] | POST | `/api/mail-items/:id/restore` | requireActiveSubscription*,requireAuth | 200 |  |  |
| [ ] | GET | `/api/mail-items/:id/scan-url` | requireActiveSubscription*,requireAuth | 400, 404, 429 |  |  |
| [ ] | POST | `/api/mail-items/:id/tag` | requireActiveSubscription*,requireAuth | 200, 403, 404 |  |  |
| [ ] | GET | `/api/mail-search/search` | none | 200 |  |  |
| [ ] | GET | `/api/mail-search/search/test` | none | 200 |  |  |
| [ ] | POST | `/api/mail/forward/forward` | none | not called |  |  |
| [ ] | GET | `/api/tags` | requireActiveSubscription*,requireAuth | 200, 401 |  |  |
| [ ] | POST | `/api/tags/delete` | requireActiveSubscription*,requireAuth | not called |  |  |
| [ ] | POST | `/api/tags/merge` | requireActiveSubscription*,requireAuth | not called |  |  |
| [ ] | POST | `/api/tags/rename` | requireActiveSubscription*,requireAuth | 200 |  |  |

### Mail / forwarding (4)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/forwarding/requests` | requireAuth | 200, 401 |  |  |
| [x] | POST | `/api/forwarding/requests` | requireAuth | 200, 404 | Name stored in address1 | 9 |
| [x] | GET | `/api/forwarding/requests/:id` | requireAuth | 200, 404 |  |  |
| [ ] | POST | `/api/requests/bulk` | requireAuth | not called |  |  |

### Onboarding (4)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/address` | none | not called | Blocked pre-payment by subscription check; needs test key | 3 |
| [ ] | GET | `/api/address/lookup` | none | 401, 500 | Blocked pre-payment by subscription check; needs test key | 3 |
| [ ] | GET | `/api/companies-house/company/:number` | none | not called | Blocked pre-payment by subscription check; needs test key | 3 |
| [ ] | GET | `/api/companies-house/search` | none | 401, 500 | Blocked pre-payment by subscription check; needs test key | 3 |

### Ops (8)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/health` | requireAdmin | not called | Always 401 | 21 |
| [ ] | GET | `/api/healthz` | none | not called |  |  |
| [ ] | GET | `/api/healthz/live` | none | not called |  |  |
| [ ] | GET | `/api/healthz/metrics` | none | not called |  |  |
| [ ] | GET | `/api/healthz/ready` | none | not called |  |  |
| [ ] | GET | `/api/healthz/status-guard` | none | not called | Public diagnostics (S5) | 12 |
| [ ] | GET | `/api/metrics` | none | 200, 401 | Public diagnostics (S5) | 12 |
| [ ] | GET | `/api/metrics/json` | none | not called | Public diagnostics (S5) | 12 |

### Ops / debug (13)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | POST | `/api/debug-email` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/debug/export-jobs/ping` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/debug/export-jobs/run-once` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/debug/forwarding-address` | requireAuth | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/dev/cleanup` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/dev/seed-user` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/dev/trigger` | none | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/migrate/fix-columns` | requireAdmin | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | POST | `/api/migrate/run` | requireAdmin | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/migrate/status` | requireAdmin | not called | Debug/repair route: remove or prove disabled (S9) | 12 |
| [ ] | GET | `/api/ops/heartbeat` | requireAuth | not called |  |  |
| [ ] | POST | `/api/ops/self-test` | requireAuth | not called |  |  |
| [ ] | GET | `/api/ops/self-test/status` | requireAuth | not called |  |  |

### Other (8)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/__version` | none | not called |  |  |
| [x] | GET | `/api/bff/mail/scan-url` | requireAuth | 403 |  |  |
| [ ] | POST | `/api/csp-report` | none | not called |  |  |
| [ ] | GET | `/api/csrf` | none | not called |  |  |
| [ ] | GET | `/api/files` | none | 401 |  |  |
| [ ] | POST | `/api/files/:id/signed-url` | none | not called |  |  |
| [ ] | GET | `/api/ideal-postcodes-key` | none | 200, 401 |  |  |
| [ ] | GET | `/api/media/blog/:filename` | none | not called |  |  |

### Public site (6)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/blog/posts` | none | 200 |  |  |
| [ ] | GET | `/api/blog/posts/:slug` | none | 404 |  |  |
| [ ] | POST | `/api/blog/upload` | requireAdmin | not called |  |  |
| [x] | POST | `/api/contact` | none | 200, 401 | Reports success with no email provider (S12) | 21 |
| [ ] | GET | `/api/quiz/stats` | none | 200 | Public diagnostics (S5) | 12 |
| [ ] | POST | `/api/quiz/submit` | none | 200, 401 |  |  |

### Support (5)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/support` | none | not called |  |  |
| [ ] | GET | `/api/support/info` | none | 200, 401 | Placeholder contact details | 20 |
| [ ] | GET | `/api/support/tickets` | requireAuth | 200, 429 |  |  |
| [ ] | POST | `/api/support/tickets` | requireAuth | 200, 403, 429 |  |  |
| [ ] | POST | `/api/support/tickets/:id/close` | requireAuth | 200, 404 |  |  |

### Verification (9)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | GET | `/api/business-owners` | requireAuth | 200, 401, 429 |  |  |
| [ ] | POST | `/api/business-owners` | requireAuth | 200, 429 |  |  |
| [ ] | POST | `/api/business-owners/:id/resend` | requireAuth | 200, 404 |  |  |
| [ ] | GET | `/api/business-owners/verify` | none | 200 |  |  |
| [ ] | POST | `/api/business-owners/verify/start` | none | 400 |  |  |
| [ ] | POST | `/api/kyc/start` | requireAuth | 403, 501 |  |  |
| [ ] | GET | `/api/kyc/status` | requireAuth | 200 |  |  |
| [ ] | POST | `/api/kyc/sync-from-sumsub` | requireAuth | not called |  |  |
| [ ] | POST | `/api/kyc/upload-documents` | requireAuth | not called |  |  |

### Webhooks (5)

| Done | Method | Route | Guards | Audit: HTTP codes seen | Known finding | Fix # |
|---|---|---|---|---|---|---|
| [ ] | POST | `/api/webhooks` | none | not called |  |  |
| [ ] | POST | `/api/webhooks-postmark` | none | not called |  |  |
| [ ] | POST | `/api/webhooks/onedrive` | none | 400, 401 | No own secret (S7) | 13 |
| [ ] | POST | `/api/webhooks/postmark` | none | not called |  |  |
| [x] | POST | `/api/webhooks/stripe` | none | not called | Never activates user / creates subscription | 4 |

## Frontend API (proxy) routes (122)

| Done | Route | Methods | Backend target | Audit: HTTP codes seen | Known finding |
|---|---|---|---|---|---|
| [ ] | `/api/_diag/env` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/admin` | GET,POST | none (handled in frontend) | 200 | Anonymous legacy stub (S4): delete |
| [ ] | `/api/admin-audit` | GET | `/admin-audit/;/admin-audit/mail-audit` | not called |  |
| [ ] | `/api/admin/billing/metrics` | GET | `/admin/billing/metrics` | not called | Backend path missing (404) |
| [ ] | `/api/admin/forwarding/locks` | GET | `/admin/forwarding/locks` | 200 |  |
| [ ] | `/api/admin/forwarding/queue` | GET | `/admin/forwarding/queue` | 404 | Backend path missing (404) |
| [ ] | `/api/admin/forwarding/requests` | GET | `/admin/forwarding/requests` | 200 |  |
| [ ] | `/api/admin/forwarding/requests/[id]` | DELETE,GET | `/admin/forwarding/requests/${id}` | not called |  |
| [ ] | `/api/admin/forwarding/requests/[id]/force-unlock` | POST | `/admin/forwarding/requests/${id}/force-unlock` | not called |  |
| [ ] | `/api/admin/forwarding/requests/[id]/status` | POST | `/admin/forwarding/requests/${id}/status` | 200, 400 |  |
| [ ] | `/api/admin/forwarding/requests/[id]/unlock` | POST | `/admin/forwarding/requests/${id}/unlock` | 404 |  |
| [ ] | `/api/admin/mail-items` | GET,POST | `/admin/mail-items` | 200, 404 | POST has no backend route |
| [ ] | `/api/admin/password-reset` | POST | none (handled in frontend) | 200 | Anonymous fake reset (S4): delete |
| [ ] | `/api/admin/plans` | GET,POST | `/admin/plans` | 200, 403 |  |
| [ ] | `/api/admin/service-status/onedrive` | GET | `/admin/service-status/onedrive` | not called |  |
| [ ] | `/api/admin/service-status/postmark` | GET | `/admin/service-status/postmark` | not called |  |
| [ ] | `/api/admin/service-status/sumsub` | GET | `/admin/service-status/sumsub` | not called |  |
| [ ] | `/api/admin/users` | GET,POST | `/admin/users` | 200, 403 |  |
| [ ] | `/api/admin/users/[id]` | DELETE,GET,PATCH,PUT | `/admin/users/${id}` | 200, 400 |  |
| [ ] | `/api/admin/users/[id]/restore` | POST | `/admin/users/${id}/restore` | not called |  |
| [ ] | `/api/admin/users/[id]/unlock-account` | POST | `/admin/users/${id}/unlock-account` | not called |  |
| [ ] | `/api/admin/users/create` | POST | none (handled in frontend) | 400 |  |
| [ ] | `/api/admin/users/send-password-reset` | POST | `/admin/users/${id}/send-password-reset` | not called |  |
| [ ] | `/api/admin/users/stats` | GET | `/admin/users/stats` | 200 |  |
| [ ] | `/api/analytics/web-vitals` | POST | none (handled in frontend) | not called |  |
| [ ] | `/api/auth/login` | POST | `/auth/login` | not called |  |
| [ ] | `/api/auth/reset-password/confirm` | POST | `/api/auth/reset-password/confirm` | not called |  |
| [ ] | `/api/auth/whoami` | GET | `/auth/whoami` | not called |  |
| [ ] | `/api/bff/account` | GET | `/api/auth/whoami;/api/bff/account;/api/bff/billing/invoices/${inv.id}/download;/api/billing/invoices?page=1&page_size=12;/api/billing/overview;/api/pr` | 200 | 200 with placeholder data when anonymous (S13) |
| [ ] | `/api/bff/account/businesses` | GET,POST | `/api/account/businesses;/api/csrf` | 200, 201, 401 |  |
| [ ] | `/api/bff/account/businesses/[businessId]` | GET,PATCH | `/api/account/businesses/${businessId};/api/csrf` | not called |  |
| [ ] | `/api/bff/account/businesses/[businessId]/set-primary` | POST | `/api/account/businesses/${businessId}/set-primary;/api/csrf` | not called |  |
| [ ] | `/api/bff/address` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/address/lookup` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/admin/activity` | GET | `/api/admin/activity?limit=${limit}&offset=${offset}` | not called |  |
| [ ] | `/api/bff/admin/billing/metrics` | GET | `/api/admin/billing/metrics` | not called |  |
| [ ] | `/api/bff/admin/blog/categories` | GET | `/api/admin/blog/categories;/api/bff/admin/blog/categories` | 502 |  |
| [ ] | `/api/bff/admin/blog/posts` | GET | `/api/admin/blog/posts?includeDrafts=${includeDrafts}&page=${page}&pageSize=${pageSize};/api/bff/admin/blog/posts` | 200 |  |
| [ ] | `/api/bff/admin/blog/posts/[slug]` | DELETE,GET,PATCH,PUT | `/api/bff/admin/blog/posts/${slug}` | not called |  |
| [ ] | `/api/bff/admin/blog/posts/create` | POST | `/api/admin/blog/posts;/api/bff/admin/blog/posts/create` | not called |  |
| [ ] | `/api/bff/admin/blog/revalidate` | POST | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/admin/blog/upload` | POST | `/api/admin/blog/upload` | not called |  |
| [ ] | `/api/bff/admin/exports/destruction-log` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/admin/forwarding/stats` | GET | `/api/admin/forwarding/stats?days=${days}` | not called |  |
| [ ] | `/api/bff/admin/health/dependencies` | GET | `/api/admin/health/dependencies` | not called |  |
| [ ] | `/api/bff/admin/health/summary` | GET | `/api/admin/health/summary` | not called |  |
| [ ] | `/api/bff/admin/invoices` | GET | `/api/admin/invoices` | 200 |  |
| [ ] | `/api/bff/admin/invoices/[id]` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/admin/invoices/[id]/download` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/admin/mail-items/[id]` | GET | none (handled in frontend) | 200 |  |
| [ ] | `/api/bff/admin/mail-items/[id]/mark-destroyed` | POST | `/api/csrf` | not called |  |
| [ ] | `/api/bff/admin/mail-items/test-excel-write` | POST | `/api/admin/mail-items/test-excel-write;/api/auth/whoami` | not called |  |
| [ ] | `/api/bff/admin/metrics/growth` | GET | `/api/admin/metrics/growth${search}` | not called |  |
| [ ] | `/api/bff/admin/overview` | GET | `/api/admin/overview` | 403 |  |
| [ ] | `/api/bff/admin/users/search` | GET | `/api/admin/users/search?q=` | not called |  |
| [ ] | `/api/bff/auth/login` | POST | `/api/auth/login;/api/bff/auth/login` | 200, 401, 429 |  |
| [ ] | `/api/bff/auth/logout` | POST | `/api/auth/logout;/api/bff/auth/logout` | 200 |  |
| [ ] | `/api/bff/auth/signup` | POST | `/api/auth/signup` | 201, 400, 409, 429, 500 |  |
| [ ] | `/api/bff/auth/whoami` | GET | `/api/auth/whoami;/api/bff/auth/whoami` | 200, 401, 429, 500 |  |
| [ ] | `/api/bff/billing/invoices` | GET | `/api/bff/billing/invoices;/api/bff/billing/invoices/${inv.id}/download;/api/billing/invoices?${searchParams}` | 200, 502 |  |
| [ ] | `/api/bff/billing/invoices/[id]/download` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/billing/overview` | GET | `/api/bff/billing/overview;/api/billing/overview` | 200, 502 |  |
| [ ] | `/api/bff/billing/payment-methods/complete` | POST | `/api/bff/billing/payment-methods/complete;/api/billing/payment-methods/complete-setup;/api/csrf` | not called |  |
| [ ] | `/api/bff/billing/payment-methods/setup-intent` | POST | `/api/bff/billing/payment-methods/setup-intent;/api/billing/payment-methods/setup-intent;/api/csrf` | not called |  |
| [ ] | `/api/bff/billing/reauthorise` | POST | `/api/bff/billing/reauthorise;/api/billing/reauthorise;/api/csrf` | not called |  |
| [ ] | `/api/bff/billing/update-bank` | POST | `/api/bff/billing/update-bank;/api/billing/update-bank;/api/csrf` | not called |  |
| [ ] | `/api/bff/blog/detail` | GET | none (handled in frontend) | 404 |  |
| [ ] | `/api/bff/blog/list` | GET | `/api/blog/posts` | 200 |  |
| [ ] | `/api/bff/business-owners` | GET,POST | `/api/bff/business-owners;/api/business-owners` | 200, 502 |  |
| [ ] | `/api/bff/business-owners/[id]/resend` | POST | `/api/bff/business-owners/${id}/resend;/api/business-owners/${id}/resend` | not called |  |
| [ ] | `/api/bff/business-owners/verify` | GET,POST | `/api/bff/business-owners/verify;/api/bff/business-owners/verify/start;/api/business-owners/verify/start` | not called |  |
| [ ] | `/api/bff/business-owners/verify/start` | POST | `/api/business-owners/verify/start` | not called |  |
| [ ] | `/api/bff/ch-verification` | GET,POST | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/companies/[number]` | GET | `/companies-house/company/${companyNumber}` | not called |  |
| [ ] | `/api/bff/companies/search` | GET | `/companies-house/search` | not called |  |
| [ ] | `/api/bff/company-details` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/company-search` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/contact` | POST | `/contact` | not called |  |
| [ ] | `/api/bff/dashboard/bootstrap` | GET | `/api/auth/whoami;/api/billing/overview;/api/profile;/api/profile/compliance` | 200, 401 |  |
| [ ] | `/api/bff/debug` | GET | `/api/auth/whoami;/api/profile` | not called |  |
| [ ] | `/api/bff/forwarding/requests` | GET,POST | `/api/auth/whoami;/api/bff/forwarding/requests;/api/forwarding/requests` | 200, 401 |  |
| [ ] | `/api/bff/forwarding/requests/[id]` | GET | `/api/forwarding/requests/${id}` | 200, 404 |  |
| [ ] | `/api/bff/forwarding/requests/bulk` | POST | `/api/bff/forwarding/requests/bulk;/api/forwarding/requests/bulk` | 404 | Backend path missing (404) |
| [ ] | `/api/bff/health` | GET | `/api/healthz` | not called |  |
| [ ] | `/api/bff/healthz` | GET | `/api/healthz` | not called |  |
| [ ] | `/api/bff/kyc/start` | POST | `/api/kyc/start` | 403 |  |
| [ ] | `/api/bff/kyc/sumsub-token` | GET | `/api/bff/kyc/sumsub-token;/api/csrf;/api/kyc/start` | not called |  |
| [ ] | `/api/bff/kyc/sync-from-sumsub` | POST | `/api/bff/kyc/sync-from-sumsub;/api/csrf;/api/kyc/sync-from-sumsub` | not called |  |
| [ ] | `/api/bff/logout` | POST | `/api/auth/logout;/api/bff/logout` | not called |  |
| [ ] | `/api/bff/mail-items` | GET | none (handled in frontend) | 200, 401, 403 |  |
| [ ] | `/api/bff/mail-items/[id]` | DELETE,PATCH | `/api/csrf;/api/mail-items/${id}` | 200 |  |
| [ ] | `/api/bff/mail-items/[id]/restore` | POST | `/api/csrf;/api/mail-items/${id}/restore` | 200 |  |
| [ ] | `/api/bff/mail/scan-url` | GET | `/api/mail-items/${mailItemId}/download?disposition=${disposition}` | 400, 404 |  |
| [ ] | `/api/bff/metrics` | GET | `/api/metrics` | not called |  |
| [ ] | `/api/bff/ops/self-test` | GET,POST | `/api/ops/heartbeat;/api/ops/self-test` | not called |  |
| [ ] | `/api/bff/payments/redirect-flows` | POST | `/api/payments/redirect-flows` | 403 |  |
| [ ] | `/api/bff/payments/stripe/checkout-session-embedded` | POST | `/api/payments/stripe/checkout-session-embedded` | 403, 500 |  |
| [ ] | `/api/bff/payments/stripe/publishable-key` | GET | `/api/payments/stripe/publishable-key` | 200, 403 |  |
| [ ] | `/api/bff/payments/stripe/session-status` | GET | `/api/payments/stripe/session-status` | not called |  |
| [ ] | `/api/bff/payments/subscription` | POST | `/api/payments/subscriptions` | not called |  |
| [ ] | `/api/bff/plans` | GET | `/plans` | 200 |  |
| [ ] | `/api/bff/profile` | GET,PATCH | `/api/bff/profile;/api/csrf;/api/profile;/api/profile/contact` | 200, 502 |  |
| [ ] | `/api/bff/profile/certificate` | GET | `/api/profile/certificate` | not called |  |
| [ ] | `/api/bff/profile/certificate-url` | GET | `/api/bff/profile/certificate;/api/profile/certificate;/api/profile/certificate-url` | 401 |  |
| [ ] | `/api/bff/profile/company-details` | PATCH | `/api/bff/profile/company-details;/api/csrf;/api/profile/company-details` | not called |  |
| [ ] | `/api/bff/profile/compliance` | GET | `/api/profile/compliance` | 200, 401 |  |
| [ ] | `/api/bff/profile/confirm-email-change` | GET | `/api/bff/profile/confirm-email-change` | not called |  |
| [ ] | `/api/bff/profile/contact` | PATCH | `/api/bff/profile/contact;/api/csrf;/api/profile/contact` | not called |  |
| [ ] | `/api/bff/profile/controllers` | PATCH | `/api/bff/profile/controllers;/api/profile/controllers` | not called |  |
| [ ] | `/api/bff/profile/email-change/resend` | POST | `/api/bff/profile/email-change/resend;/api/profile/email-change/resend` | not called |  |
| [ ] | `/api/bff/profile/registered-office-address` | GET | `/api/bff/profile/registered-office-address;/api/profile/registered-office-address` | 401 |  |
| [ ] | `/api/bff/quiz/ping` | POST | none (handled in frontend) | not called |  |
| [ ] | `/api/bff/quiz/submit` | POST | `/api/quiz/submit` | not called |  |
| [ ] | `/api/bff/tags` | GET | `/api/tags` | 200, 401 |  |
| [ ] | `/api/bff/tags/delete` | POST | `/api/tags/delete` | not called |  |
| [ ] | `/api/bff/tags/merge` | POST | `/api/csrf;/api/tags/merge` | not called |  |
| [ ] | `/api/bff/tags/rename` | POST | `/api/csrf;/api/tags/rename` | 200 |  |
| [ ] | `/api/blog/compile-mdx` | POST | none (handled in frontend) | not called |  |
| [ ] | `/api/ideal-postcodes-key` | GET | none (handled in frontend) | not called |  |
| [ ] | `/api/profile/reset-password` | POST | `/api/auth/reset-password/confirm` | not called |  |
| [ ] | `/api/profile/reset-password-request` | POST | `/api/profile/reset-password-request` | not called |  |
| [ ] | `/api/revalidate` | POST | `/api/bff/admin/blog/revalidate` | not called |  |

48 of 122 proxy routes were called during the audit.

## Pages opened in the browser (45)

Views: pub = anonymous, dash = active test customer, adm = admin; _d = 1440px, _m = 390px. Screenshots are in `screenshots/`.

| Done | Page | Views captured | Status / landed on | Critical+serious axe issues (max) |
|---|---|---|---|---|
| [ ] | `/` | pub_d, pub_m | 200 | 17 |
| [ ] | `/about` | pub_d, pub_m | 200 | 0 |
| [ ] | `/account` | dash_d | 200 → /account/overview | 0 |
| [ ] | `/account/addresses` | dash_d | 200 | 0 |
| [ ] | `/account/billing` | dash_d, dash_m | 200 | 0 |
| [ ] | `/account/businesses` | dash_d | 200 | 0 |
| [ ] | `/account/overview` | dash_d, dash_m | 200 | 0 |
| [ ] | `/account/settings` | dash_d, dash_m | 200 | 0 |
| [ ] | `/account/support` | dash_d | 200 | 0 |
| [ ] | `/account/verification` | dash_d | 200 | 1 |
| [ ] | `/admin/dashboard` | adm_d, dash_d | 200; 200 → /admin/login | 3 |
| [ ] | `/admin/dashboard?section=audit` | adm2 | 200 | 0 |
| [ ] | `/admin/dashboard?section=blog` | adm2 | 200 | 2 |
| [ ] | `/admin/dashboard?section=forwarding` | adm2 | 200 | 1 |
| [ ] | `/admin/dashboard?section=mail` | adm2 | 200 | 0 |
| [ ] | `/admin/dashboard?section=plans` | adm2 | 200 | 0 |
| [ ] | `/admin/dashboard?section=users` | adm_d | 200 | 3 |
| [ ] | `/admin/filename-generator` | adm_d | 200 | 0 |
| [ ] | `/admin/forwarding` | adm2, adm_d | 200 | 1 |
| [ ] | `/admin/invoices` | adm_d | 200 | 0 |
| [ ] | `/admin/mail/2` | adm_d | 200 | 0 |
| [ ] | `/admin/manual-forwarding` | adm_d | 200 | 0 |
| [ ] | `/billing` | dash_d | 200 → /account/overview | 0 |
| [ ] | `/blog` | pub_d, pub_m | 200 | 1 |
| [ ] | `/business-owners` | dash_d | 200 | 0 |
| [ ] | `/compliance-check` | pub_d, pub_m | 200 | 1 |
| [ ] | `/contact` | pub_d, pub_m | 200 | 8 |
| [ ] | `/dev-api-check` | adm_d | 200 | 0 |
| [ ] | `/docs/api` | pub_d | 200 | 0 |
| [ ] | `/forwarding` | dash_d | 200 → /mail | 3 |
| [ ] | `/help` | pub_d, pub_m | 200 | 17 |
| [ ] | `/kyc` | pub_d | 200 | 0 |
| [ ] | `/login` | pub_d, pub_m | 200 | 5 |
| [ ] | `/mail` | dash_d, dash_m | 200 | 3 |
| [ ] | `/nonexistent-page` | pub_d | 404 | 0 |
| [ ] | `/plans` | pub_d | 200 | 0 |
| [ ] | `/pricing` | pub_d, pub_m | 200 | 0 |
| [ ] | `/privacy` | pub_d | 200 | 0 |
| [ ] | `/reset-password` | pub_d | 200 | 0 |
| [ ] | `/settings` | dash_d | 200 → /account/overview | 0 |
| [ ] | `/signup` | pub_d, pub_m | 200 | 0 |
| [ ] | `/terms` | pub_d, pub_m | 200 | 0 |
| [ ] | `/test-mail-management` | adm_d | 404 | 0 |
| [ ] | `/verify-email-change` | pub_d | 200 | 1 |
| [ ] | `/verify-owner` | pub_d | 200 | 1 |
