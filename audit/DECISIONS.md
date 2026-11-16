# Decision log

Newest last. Source: owner instructions of the date shown.

| # | Date | Decision | Status |
|---|---|---|---|
| 1 | 15 Nov | No paying customers. Stripe is the sole billing provider | Fixed |
| 2 | 15 Nov | GoCardless removed from active code, dependencies, configuration, routes, UI, tests and fresh schemas; historical migrations kept | Done. Render changes prepared in `scripts/pending-production`, not run |
| 3 | 15 Nov | Fresh local/test databases: baseline (empty database only) + forward-only migrations | Implemented |
| 4 | 15 Nov | Account standing, payment entitlement and verification are separate. One access decision for backend and frontend | Implemented: `services/access.ts`, `GET /api/access`, dashboard gate and notice |
| 5 | 15 Nov | Full service = good standing + paid entitlement + approved primary identity + every required owner verified + any other confirmed mandatory check | Implemented for the first four. No other check is confirmed (see deferred) |
| 6 | 15 Nov | Customers can always register, log in and complete onboarding; login lands on the next step | Implemented: unpaid -> billing, unverified -> verification, owners -> owners page, overdue/cancelled -> billing, eligible -> inbox, suspended/closed -> login with a clear message |
| 7 | 15 Nov | A payment event never bypasses verification, suspension or closure | Implemented and tested (mock) |
| 8 | 15 Nov | Restricted customers: no mail list, item, preview, scan, download or forwarding, enforced in the backend and file access. Generic "mail is waiting" email and dashboard notice only, with no sender, subject, scan or contents | Implemented and tested (mock): backend, email and dashboard notice |
| 9 | 15 Nov | No HMRC / Companies House forwarding exception for unverified customers | Implemented |
| 10 | 15 Nov | Incoming mail is always stored and released automatically on eligibility. No automatic destruction or return of held mail | Implemented (access is decided at read time) |
| 11 | 15 Nov | Adding a required owner pauses full service until verified. No 14-day allowance | Implemented by the access rule; UI wording pending |
| 12 | 15 Nov | Company number not required for onboarding; still required for the certificate. Companies House verification flow preserved | Unchanged in code |
| 13 | 15 Nov | No renewal grace period. Service continues through the period already paid for, then is restricted | Implemented and tested (mock) |
| 14 | 15 Nov | Self-service cancellation at period end, date shown. Admin immediate cancellation is audited, no automatic refund | Event handling implemented; UI and admin action pending |
| 15 | 15 Nov | Final identity rejection goes to admin review. Cancellation, refund, closure are explicit admin actions with reasons. Providers never refund or close | Suspend/restore/close done. Cancellation and refund actions are outstanding provider work |
| 16 | 15 Nov | Suspension and closure override everything; Stripe and Sumsub never undo them | Implemented: admin suspend / restore / close with reasons and audit trail; tested |
| 17 | 15 Nov | Verified account-holder identity is reused across businesses; each business keeps its own details and owner checks. Extra-business purchase stays pending | Not started |
| 18 | 15 Nov | Metrics and quiz statistics are access-controlled | Implemented |
| 19 | 15 Nov | Render database changes need a schema review, backup/recovery plan and separate approval | Standing rule |
| 20 | 14 Nov | Postmark rotation parked; no deployment, production change or destructive operation on existing data without approval | Standing rule |

## Deferred launch decisions (owner)

1. Held-mail retention and disposal for accounts that never become eligible.
2. Extra-business pricing and activation.
3. Whether the Companies House identity check, or any other check, is mandatory for full service. Today only identity and owner verification gate service. The access rule is an application rule, not evidence of regulatory compliance.
4. Clean-up of accounts that sign up and never pay.
5. Refund policy after a final identity rejection.
6. Renewal grace period (currently none).

## Outstanding provider work (parked 15 Nov; mock tests exist, nothing below is proven against the provider)

**Stripe**
- A real test-mode card payment through the embedded checkout, and events delivered by Stripe itself (needs test keys and price ids in `local/backend.env`).
- Customer portal session opening for a real customer (code path exists: `/api/billing/portal`).
- Changing plan (monthly <-> annual): returns 501 until it updates the Stripe subscription.
- Admin immediate cancellation and refunds: not built. Suspend and close report a live Stripe subscription as "action required"; they do not cancel it.
- Collecting forwarding charges through Stripe. Related open question: the internal invoice generator adds the subscription fee, which Stripe already invoices (6 invoiceService tests fail on this).
- Welcome email after first payment is no longer sent (it was tied to the GoCardless handler).
- A payment event with a plan that does not match keeps failing on every Stripe retry by design; needs an admin view of failed events.

**Sumsub**
- Live widget and applicant creation (needs sandbox credentials).
- Event safety: duplicate and out-of-order protection, and separate "needs information" vs "final rejection" states, are NOT implemented. A late "pending" event can still overwrite "approved".
- Final rejection -> admin review queue.

**Others**
- Postmark: real delivery and templates (parked). Local outbox only.
- OneDrive pickup by the worker; Companies House search; address lookup: need test credentials.

## Implementation notes in effect

- New migrations are named `YYYYMMDD_NN_description.sql` so they sort after every historical file.
- Payment entitlement: subscription `active` with a Stripe subscription id, or `past_due` while `paid_through_ms` (end of the last paid invoice period) is in the future. `cancelled` is never entitled.
- `user.status` is account standing only: `active`, `suspended`, `closed`. Signup writes `active`. `pending_payment` is a legacy value still accepted at login.
- Auth rate limit counts failed attempts only (30 per 15 minutes per client); signup 60 per hour; per-user 600 per 15 minutes. The website signs the visitor's address with `BFF_SHARED_SECRET` so limits are per visitor.
- Email in local/test goes to the `local_email_outbox` table (`MAIL_TRANSPORT=outbox`); never enabled in production.
