# Legacy backend tests (`apps/backend/tests`, 58 files) — triage, 18 Nov 2026

The legacy suite ran under Jest (`npm test`), whose runner no longer starts in this repo (ts-jest/Jest
version mismatch). Most files also import entry points that no longer exist (`../server`,
`dist/server/index.js`, `routes/address`). Each file was read and classified. Unique, still-valid
coverage was ported to Vitest and now runs with the maintained suite (`npm test` → `vitest run src`).

## Ported (now passing in `src/tests`)
| Legacy file | Now | Changes needed |
|---|---|---|
| business-owners-resend.spec.ts | integration/businessOwners.resend.test.ts | Jest mocks → Vitest |
| owner-verify-context.spec.ts | integration/businessOwners.verifyContext.test.ts | none |
| compliance-certificate.spec.ts | integration/profile.certificate.test.ts | full-service gate stubbed (covered by access-control.mjs) |
| registered-office-address.spec.ts | integration/profile.registeredOffice.test.ts | fixture gains `user_status` + entitlement (route now checks both) |
| unit/template-models.spec.ts | unit/templateModels.test.ts | removed 2 aliases that are plain emails, not templates |
| unit/mailer.templates.spec.ts | unit/mailerTemplates.test.ts | `lib/mailer.ts` now imports Postmark as a module so the mock applies. **Before this, the test called the real Postmark API.** |
| e2e/profile-patch.test.ts (skipped without a live token) | integration/profilePatch.safety.test.ts | rewritten for the test DB; **found that PATCH /api/profile returned the password hash** (audit S1) — fixed |
| api.contact.contract.test.ts (needed a running server) | integration/contact.routes.test.ts | runs in-process |

## Kept as is
- `tests/e2e/*.test.ts` (8 files: health, plans, profile, profile-patch, password-reset, postmark-webhook, contact, help.sla) —
  live-server checks run by GitHub Actions (`backend-e2e.yml`, `e2e.yml`) against Render staging via
  `npm run test:e2e` and `jest.e2e.config.js`. Not part of the local suite. Not changed, to avoid altering CI.
  `contact.spec.ts` and `help.sla.spec.ts` are Playwright files Jest does not pick up (`*.test.ts` only).
- `tests/journey/*.mjs` — the maintained end-to-end suites.
- `tests/k6/smoke.js` — load-test script (uncertain whether still used; kept).

## Retired (deleted) — reason
| Files | Reason |
|---|---|
| account, app, kyc_idempotency, kyc_support, mail_admin, mail_user, not_found, rate_limit, reports_webhooks, security_rbac (`*.spec.js`), `_helpers.js` | Import `../server`, which no longer exists; cover login, KYC, mail, RBAC, 404s and rate limits, now covered by src integration tests and journey/access-control/rate-limits suites |
| payments.spec.js | Tests the GoCardless redirect flow (removed) |
| address.test.js | Imports `routes/address`, which no longer exists; address lookup now runs in the website |
| smoke/*.spec.js (24 files) | Generated route smoke list against `dist/server/index.js` (not a build output any more); several routes removed; superseded by `src/tests/integration/*` (one file per route group) |
| stripe-webhook.spec.js | Targets `dist/server/index.js`; superseded by `tests/journey/stripe-events.mjs` (17 checks incl. duplicates, ordering, signatures) |
| integration/deletedRoutes.regression.spec.ts | Same test already exists as `src/tests/integration/deletedRoutes.regression.test.ts` |
| api-response-format.spec.ts, auth-signup.spec.ts, auth.smoke.spec.ts, smoke.spec.ts | Duplicate the auth/public route tests in src; auth-signup expected a token in the signup body (now a cookie) |
| forwarding-status.spec.ts | Always skipped (needed admin credentials); covered by journey 8.x and adminForwarding tests |
| api.contact.test.ts | Started the Next.js frontend from the backend's tests; contact contract now ported (above) |
| invoice-download.spec.ts | Playwright test for single-use invoice links (410 on reuse); Playwright not installed and the link scheme is not used by the current invoice download |

`jest.backend.config.cjs`, `tests/jest.config.cjs` and `tests/jest.setup.cjs` were only used by the retired files.
