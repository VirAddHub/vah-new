# Backend API inventory

**Frontend Connected** (last refreshed against `apps/frontend` and `apps/backend/src/app.ts`): `yes` if user-facing code under `apps/frontend` calls that backend path (including via `API_BASE` / `apiDirect`), or a Next.js route under `apps/frontend/app/api/**` proxies to it (including `/api/admin/*` server proxies and `/api/bff/*` BFF handlers). `no` if only servers, webhooks, CLI, or tests reference it. `ambiguous` when the mapping is indirect or shared helpers make static matching unclear.

## Auth

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/csrf` | Fetch CSRF token for browser clients | `apps/backend/src/app.ts` | `yes` |
| POST | `/api/auth/signup` | Register a new user account | `apps/backend/src/server/routes/auth.ts` | `yes` |
| POST | `/api/auth/login` | Authenticate user and create session/JWT context | `apps/backend/src/server/routes/auth.ts` | `yes` |
| POST | `/api/auth/logout` | Log out current user | `apps/backend/src/server/routes/auth.ts` | `yes` |
| GET | `/api/auth/whoami` | Return authenticated user identity/session | `apps/backend/src/server/routes/auth.ts` | `yes` |
| POST | `/api/auth/reset-password/request` | Start password reset (canonical handler) | `apps/backend/src/server/routes/auth.ts` | `yes` |
| POST | `/api/profile/reset-password-request` | Compatibility entry: redirects to `/api/auth/reset-password/request` | `apps/backend/src/app.ts` | `yes` |
| POST | `/api/auth/reset-password/confirm` | Confirm password reset token and set new password | `apps/backend/src/server/routes/auth.ts` | `yes` |

## Profile

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/profile/` | Get profile details | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/compliance` | Get compliance/KYC-related profile state | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/me` | Get current user profile summary | `apps/backend/src/server/routes/profile.ts` | `yes` |
| PATCH | `/api/profile/` | Update core profile fields | `apps/backend/src/server/routes/profile.ts` | `yes` |
| PATCH | `/api/profile/company-details` | Update company details in profile | `apps/backend/src/server/routes/profile.ts` | `yes` |
| PATCH | `/api/profile/me` | Patch self profile fields | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/registered-office-address` | Get registered office address data | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/certificate-url` | Get URL for certificate asset | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/certificate` | Download/serve company certificate | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/ch-verification` | Get Companies House verification status | `apps/backend/src/server/routes/profile.ts` | `yes` |
| POST | `/api/profile/ch-verification` | Submit Companies House verification document | `apps/backend/src/server/routes/profile.ts` | `yes` |
| GET | `/api/profile/media/ch-verification/:filename` | Serve CH verification media file | `apps/backend/src/server/routes/profile.ts` | `no` |
| PATCH | `/api/profile/controllers` | Update company controller information | `apps/backend/src/server/routes/profile.ts` | `yes` |
| PATCH | `/api/profile/contact` | Request/update profile contact email/phone change | `apps/backend/src/server/routes/profileEmailChange.ts` | `yes` |
| GET | `/api/profile/confirm-email-change` | Confirm pending email change via token | `apps/backend/src/server/routes/profileEmailChange.ts` | `yes` |
| POST | `/api/profile/email-change/resend` | Resend email change confirmation | `apps/backend/src/server/routes/profileEmailChange.ts` | `yes` |
| GET | `/api/business-owners/` | List business owners | `apps/backend/src/server/routes/businessOwners.ts` | `yes` |
| POST | `/api/business-owners/` | Create/add business owner | `apps/backend/src/server/routes/businessOwners.ts` | `yes` |
| POST | `/api/business-owners/:id/resend` | Resend owner verification invitation | `apps/backend/src/server/routes/businessOwners.ts` | `yes` |
| GET | `/api/business-owners/verify` | Verify owner token/status | `apps/backend/src/server/routes/businessOwners.ts` | `yes` |
| POST | `/api/business-owners/verify/start` | Start owner verification flow | `apps/backend/src/server/routes/businessOwners.ts` | `yes` |
| GET | `/api/account/businesses` | List user businesses | `apps/backend/src/server/routes/account-businesses.ts` | `yes` |
| POST | `/api/account/businesses` | Create/link business for account | `apps/backend/src/server/routes/account-businesses.ts` | `yes` |
| GET | `/api/account/businesses/:businessId` | Get one business record | `apps/backend/src/server/routes/account-businesses.ts` | `yes` |
| PATCH | `/api/account/businesses/:businessId` | Update business record | `apps/backend/src/server/routes/account-businesses.ts` | `yes` |
| POST | `/api/account/businesses/:businessId/set-primary` | Set primary business for account | `apps/backend/src/server/routes/account-businesses.ts` | `yes` |

## KYC

> The main KYC verification UI is handled by the **Sumsub SDK** embedded directly in the user dashboard — not by these backend routes. These routes support the SDK flow: token generation, status polling, and sync.

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/kyc/status` | Get KYC status for current user (polls approval state — returns `status`, `verified_at`, `rejection_reason`, `applicant_id`) | `apps/backend/src/server/routes/kyc.ts` | `yes` |
| POST | `/api/kyc/start` | Create Sumsub applicant if needed; return SDK token + `applicantId` for dashboard embed | `apps/backend/src/server/routes/kyc.ts` | `yes` |
| POST | `/api/kyc/sync-from-sumsub` | Pull latest review result from Sumsub API to fix stale dashboard state | `apps/backend/src/server/routes/kyc.ts` | `yes` |
| POST | `/api/kyc/upload-documents` | Not implemented — returns `501` | `apps/backend/src/server/routes/kyc.ts` | `no` |

## Billing

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/billing/overview` | Get account billing overview | `apps/backend/src/server/routes/billing.ts` | `yes` |
| GET | `/api/billing/invoices` | List own invoices | `apps/backend/src/server/routes/billing.ts` | `yes` |
| GET | `/api/billing/invoices/:id` | Get one invoice details | `apps/backend/src/server/routes/billing.ts` | `no` |
| GET | `/api/billing/invoices/:id/download` | Download invoice PDF | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/update-bank` | Update billing bank details | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/reauthorise` | Re-authorize billing mandate/payment method | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/payment-methods/setup-intent` | Create Stripe setup intent for payment method | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/payment-methods/complete-setup` | Finalize payment method setup | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/retry-payment` | Retry failed payment | `apps/backend/src/server/routes/billing.ts` | `no` |
| POST | `/api/billing/change-plan` | Change customer plan from billing context | `apps/backend/src/server/routes/billing.ts` | `yes` |
| POST | `/api/billing/cancel` | Cancel subscription at period end | `apps/backend/src/server/routes/billing.ts` | `no` |
| POST | `/api/admin/generate-invoice` | Admin-trigger invoice generation | `apps/backend/src/server/routes/admin-billing.ts` | `no` |
| POST | `/api/admin/repair-orphan-charges` | Repair orphan charge records | `apps/backend/src/server/routes/admin-billing.ts` | `no` |
| POST | `/api/admin/recalculate-invoice` | Recalculate invoice totals/state | `apps/backend/src/server/routes/admin-billing.ts` | `no` |
| GET | `/api/admin/invoices` | Admin list invoices | `apps/backend/src/server/routes/admin-invoices.ts` | `yes` |
| GET | `/api/admin/invoices/:id` | Admin fetch invoice details | `apps/backend/src/server/routes/admin-invoices.ts` | `yes` |
| GET | `/api/admin/invoices/:id/download` | Admin download invoice PDF | `apps/backend/src/server/routes/admin-invoices.ts` | `yes` |

## Payments

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/payments/subscriptions/status` | Get subscription/payment status | `apps/backend/src/server/routes/payments.ts` | `yes` |
| POST | `/api/payments/subscriptions` | Create/update subscription | `apps/backend/src/server/routes/payments.ts` | `yes` |
| POST | `/api/payments/redirect-flows` | Create payment redirect flow | `apps/backend/src/server/routes/payments.ts` | `yes` |
| POST | `/api/payments/stripe/checkout-session` | Create Stripe Checkout session | `apps/backend/src/server/routes/stripe-checkout.ts` | `no` |
| POST | `/api/payments/stripe/checkout-session-embedded` | Create embedded Stripe Checkout session | `apps/backend/src/server/routes/stripe-checkout.ts` | `yes` |
| GET | `/api/payments/stripe/session-status` | Check Stripe session status | `apps/backend/src/server/routes/stripe-checkout.ts` | `yes` |
| GET | `/api/payments/stripe/publishable-key` | Return Stripe publishable key | `apps/backend/src/server/routes/stripe-checkout.ts` | `yes` |
| POST | `/api/payments/redirect-flows` | Stub redirect-flow creation fallback | `apps/backend/src/server/routes/payments-stub.ts` | `yes` |
| POST | `/api/payments/subscriptions` | Stub subscription creation fallback | `apps/backend/src/server/routes/payments-stub.ts` | `yes` |
| GET | `/api/payments/capabilities` | Return payment capability flags (stub) | `apps/backend/src/server/routes/payments-stub.ts` | `no` |

## Mail

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/mail-items` | List user mail items | `apps/backend/src/server/routes/mail.ts` | `yes` |
| GET | `/api/mail-items/:id` | Get one mail item | `apps/backend/src/server/routes/mail.ts` | `yes` |
| PATCH | `/api/mail-items/:id` | Update mail item state/metadata | `apps/backend/src/server/routes/mail.ts` | `yes` |
| POST | `/api/mail-items/:id/tag` | Add/update tag for mail item | `apps/backend/src/server/routes/mail.ts` | `no` |
| DELETE | `/api/mail-items/:id` | Soft-delete/archive mail item | `apps/backend/src/server/routes/mail.ts` | `yes` |
| POST | `/api/mail-items/:id/restore` | Restore deleted mail item | `apps/backend/src/server/routes/mail.ts` | `yes` |
| GET | `/api/mail-items/:id/scan-url` | Get secure scan URL for mail item | `apps/backend/src/server/routes/mail.ts` | `yes` |
| GET | `/api/mail-items/:id/download` | Download mail item scan/file | `apps/backend/src/server/routes/mail.ts` | `yes` |
| POST | `/api/tags/rename` | Rename a mail tag | `apps/backend/src/server/routes/mail.ts` | `yes` |
| POST | `/api/tags/merge` | Merge two mail tags | `apps/backend/src/server/routes/mail.ts` | `yes` |
| GET | `/api/tags` | List available tags | `apps/backend/src/server/routes/mail.ts` | `yes` |
| POST | `/api/tags/delete` | Delete a tag | `apps/backend/src/server/routes/mail.ts` | `yes` |
| GET | `/api/mail-search/search` | Search mail items | `apps/backend/src/server/routes/mail-search.ts` | `no` |
| GET | `/api/mail-search/search/test` | Mail search diagnostic/test endpoint | `apps/backend/src/server/routes/mail-search.ts` | `no` |
| GET | `/api/downloads/export/:token` | Download GDPR export archive by token | `apps/backend/src/server/routes/downloads.ts` | `no` |
| GET | `/api/files/` | List file records/assets | `apps/backend/src/server/routes/files.ts` | `yes` |
| POST | `/api/files/:id/signed-url` | Create signed URL for file access | `apps/backend/src/server/routes/files.ts` | `yes` |
| GET | `/api/notifications/` | List notifications | `apps/backend/src/server/routes/notifications.ts` | `yes` |
| POST | `/api/notifications/mark-read` | Mark notifications as read | `apps/backend/src/server/routes/notifications.ts` | `no` |
| GET | `/api/email-prefs/` | Get email preference settings | `apps/backend/src/server/routes/email-prefs.ts` | `yes` |
| POST | `/api/email-prefs/` | Update email preference settings | `apps/backend/src/server/routes/email-prefs.ts` | `yes` |

## Forwarding

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/forwarding/requests` | List user forwarding requests | `apps/backend/src/server/routes/forwarding.ts` | `yes` |
| GET | `/api/forwarding/requests/:id` | Get forwarding request details | `apps/backend/src/server/routes/forwarding.ts` | `yes` |
| POST | `/api/forwarding/requests` | Create forwarding request | `apps/backend/src/server/routes/forwarding.ts` | `yes` |
| POST | `/api/forwarding/requests/bulk` | Bulk-create forwarding requests | `apps/backend/src/server/routes/forwarding.ts` | `yes` |
| POST | `/api/mail/forward/forward` | Trigger physical mail forwarding action | `apps/backend/src/server/routes/mail-forward.ts` | `no` |
| GET | `/api/admin/forwarding/stats` | Admin forwarding stats summary | `apps/backend/src/server/routes/admin-forwarding.ts` | `yes` |
| GET | `/api/admin/forwarding/requests` | Admin list/filter forwarding requests | `apps/backend/src/server/routes/admin-forwarding.ts` | `yes` |
| PATCH | `/api/admin/forwarding/requests/:id` | Admin update forwarding request | `apps/backend/src/server/routes/admin-forwarding.ts` | `yes` |
| POST | `/api/admin/forwarding/complete` | Admin complete forwarding workflow | `apps/backend/src/server/routes/admin-forwarding.ts` | `no` |
| POST | `/api/admin/forwarding/requests/:id/status` | Admin set forwarding status | `apps/backend/src/server/routes/admin-forwarding.ts` | `yes` |
| DELETE | `/api/admin/forwarding/requests/:id` | Admin delete forwarding request | `apps/backend/src/server/routes/admin-forwarding.ts` | `yes` |
| GET | `/api/admin/forwarding/requests/:id/debug-status` | Admin debug forwarding status details | `apps/backend/src/server/routes/admin-forwarding-debug.ts` | `yes` |
| POST | `/api/admin/forwarding/requests/:id/lock` | Acquire forwarding request lock | `apps/backend/src/server/routes/admin-forwarding-locks.ts` | `yes` |
| POST | `/api/admin/forwarding/requests/:id/unlock` | Release forwarding request lock | `apps/backend/src/server/routes/admin-forwarding-locks.ts` | `yes` |
| GET | `/api/admin/forwarding/requests/:id/lock-status` | Check forwarding lock state | `apps/backend/src/server/routes/admin-forwarding-locks.ts` | `no` |
| POST | `/api/admin/forwarding/requests/:id/force-unlock` | Force unlock stuck forwarding lock | `apps/backend/src/server/routes/admin-forwarding-locks.ts` | `yes` |
| GET | `/api/admin/forwarding/locks` | List active forwarding locks | `apps/backend/src/server/routes/admin-forwarding-locks.ts` | `yes` |
## Admin

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/admin/users` | Admin list users | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| GET | `/api/admin/users/search` | Admin search users | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| GET | `/api/admin/users/stats` | Admin user statistics | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| GET | `/api/admin/users/deleted` | Admin list deleted users | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| GET | `/api/admin/users/:id` | Admin get user details | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| PATCH | `/api/admin/users/:id` | Admin update user | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| DELETE | `/api/admin/users/:id` | Admin soft-delete user | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| POST | `/api/admin/users/:id/restore` | Admin restore deleted user | `apps/backend/src/server/routes/admin-users.ts` | `yes` |
| GET | `/api/admin/stats` | Admin dashboard stats | `apps/backend/src/server/routes/admin-stats.ts` | `yes` |
| GET | `/api/admin/plans` | Admin list plans | `apps/backend/src/server/routes/admin-plans.ts` | `yes` |
| GET | `/api/admin/plans/:id` | Admin get plan by id | `apps/backend/src/server/routes/admin-plans.ts` | `yes` |
| POST | `/api/admin/plans` | Admin create plan | `apps/backend/src/server/routes/admin-plans.ts` | `yes` |
| PATCH | `/api/admin/plans/:id` | Admin update plan | `apps/backend/src/server/routes/admin-plans.ts` | `yes` |
| DELETE | `/api/admin/plans/:id` | Admin delete plan | `apps/backend/src/server/routes/admin-plans.ts` | `yes` |
| GET | `/api/admin/mail-items` | Admin list mail items | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| GET | `/api/admin/mail-items/:id` | Admin get mail item details | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| PUT | `/api/admin/mail-items/:id` | Admin update mail item | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| POST | `/api/admin/mail-items/:id/log-physical-dispatch` | Admin log physical dispatch event | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| POST | `/api/admin/mail-items/:id/mark-destroyed` | Admin mark item destroyed | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| POST | `/api/admin/mail-items/test-excel-write` | Admin test Excel export/write path | `apps/backend/src/server/routes/admin-mail-items.ts` | `yes` |
| POST | `/api/admin/mail-items/bulk` | Admin bulk mail-item operations | `apps/backend/src/server/routes/admin-mail-items.ts` | `no` |
| GET | `/api/admin/activity` | Admin activity feed | `apps/backend/src/server/routes/admin-activity.ts` | `yes` |
| GET | `/api/admin/health/summary` | Admin health summary | `apps/backend/src/server/routes/admin-health.ts` | `yes` |
| GET | `/api/admin/health/dependencies` | Admin dependency health checks | `apps/backend/src/server/routes/admin-health.ts` | `yes` |
| GET | `/api/admin/overview/` | Admin top-level overview payload | `apps/backend/src/server/routes/admin-overview.ts` | `yes` |
| GET | `/api/admin/gocardless` | Admin GoCardless service status | `apps/backend/src/server/routes/admin-service-status.ts` | `no` |
| GET | `/api/admin/sumsub` | Admin Sumsub service status | `apps/backend/src/server/routes/admin-service-status.ts` | `no` |
| GET | `/api/admin/postmark` | Admin Postmark service status | `apps/backend/src/server/routes/admin-service-status.ts` | `no` |
| GET | `/api/admin/onedrive` | Admin OneDrive service status | `apps/backend/src/server/routes/admin-service-status.ts` | `no` |
| GET | `/api/admin/metrics/growth` | Admin growth metrics | `apps/backend/src/server/routes/admin-metrics-growth.ts` | `yes` |
| GET | `/api/admin/exports/destruction-log` | Admin destruction log export | `apps/backend/src/server/routes/admin-exports.ts` | `yes` |
| GET | `/api/admin-audit/` | Admin audit list | `apps/backend/src/server/routes/admin-audit.ts` | `yes` |
| GET | `/api/admin-audit/mail-audit` | Admin mail audit records | `apps/backend/src/server/routes/admin-audit.ts` | `no` |
| GET | `/api/admin-forward-audit/` | Admin forwarding audit feed | `apps/backend/src/server/routes/admin-forward-audit.ts` | `yes` |
| POST | `/api/admin-repair/fts` | Admin FTS repair operation | `apps/backend/src/server/routes/admin-repair.ts` | `no` |
| POST | `/api/admin-repair/fts/rebuild` | Admin rebuild full-text indexes | `apps/backend/src/server/routes/admin-repair.ts` | `no` |
| POST | `/api/admin-repair/backfill-expiry` | Admin backfill expiry data | `apps/backend/src/server/routes/admin-repair.ts` | `no` |
| GET | `/api/admin/blog/posts` | Admin list blog posts | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| GET | `/api/admin/blog/posts/:slug` | Admin get one blog post | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| POST | `/api/admin/blog/posts` | Admin create blog post | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| PUT | `/api/admin/blog/posts/:slug` | Admin update blog post | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| DELETE | `/api/admin/blog/posts/:slug` | Admin delete blog post | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| GET | `/api/admin/blog/categories` | Admin list blog categories | `apps/backend/src/server/routes/admin-blog.ts` | `yes` |
| POST | `/api/admin/blog/upload` | Admin upload blog media asset | `apps/backend/src/server/routes/admin-media.ts` | `yes` |
| GET | `/api/admin/media/blog/:filename` | Admin-access blog media fetch | `apps/backend/src/server/routes/admin-media.ts` | `no` |
| GET | `/api/admin/ch-verification/submissions` | Admin list CH verification submissions | `apps/backend/src/server/routes/admin-ch-verification.ts` | `yes` |
| POST | `/api/admin/ch-verification/:userId/approve` | Admin approve CH verification | `apps/backend/src/server/routes/admin-ch-verification.ts` | `yes` |
| POST | `/api/admin/ch-verification/:userId/reject` | Admin reject CH verification | `apps/backend/src/server/routes/admin-ch-verification.ts` | `yes` |

## Webhooks

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| POST | `/api/webhooks-postmark` | Permanent redirect (308) to `/api/webhooks/postmark` | `apps/backend/src/app.ts` | `no` |
| POST | `/api/webhooks/postmark` | Receive Postmark webhook events (raw JSON body) | `apps/backend/src/app.ts` | `no` |
| GET | `/api/webhooks/gocardless` | GoCardless webhook readiness/diagnostic endpoint | `apps/backend/src/server/routes/webhooks-gocardless.ts` | `no` |
| POST | `/api/webhooks/gocardless` | Receive GoCardless webhook events | `apps/backend/src/server/routes/webhooks-gocardless.ts` | `no` |
| POST | `/api/webhooks/stripe` | Receive Stripe webhook events | `apps/backend/src/server/routes/webhooks-stripe.ts` | `no` |
| POST | `/api/webhooks/sumsub/` | Receive Sumsub webhook events | `apps/backend/src/server/routes/webhooks-sumsub.ts` | `no` |
| POST | `/api/webhooks/onedrive` | Receive OneDrive webhook callbacks | `apps/backend/src/server/routes/webhooks-onedrive.ts` | `no` |
| POST | `/api/webhooks-onedrive` | Permanent redirect (308) to `/api/webhooks/onedrive` | `apps/backend/src/app.ts` | `no` |

## Public

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/plans` | Public plans/pricing listing | `apps/backend/src/server/routes/public/plans.ts` | `yes` |
| GET | `/api/blog/posts` | Public blog post list | `apps/backend/src/server/routes/blog.ts` | `yes` |
| GET | `/api/blog/posts/:slug` | Public blog post details | `apps/backend/src/server/routes/blog.ts` | `yes` |
| GET | `/api/media/blog/:filename` | Public blog media fetch | `apps/backend/src/server/routes/admin-media.ts` | `no` |
| GET | `/api/support/` | Support service root info | `apps/backend/src/server/routes/support.ts` | `yes` |
| GET | `/api/support/info` | Support contact/help information | `apps/backend/src/server/routes/support.ts` | `no` |
| GET | `/api/support/tickets` | List support tickets for user | `apps/backend/src/server/routes/support.ts` | `yes` |
| POST | `/api/support/tickets` | Create support ticket | `apps/backend/src/server/routes/support.ts` | `yes` |
| POST | `/api/support/tickets/:id/close` | Close support ticket | `apps/backend/src/server/routes/support.ts` | `yes` |
| POST | `/api/contact/` | Submit contact form inquiry | `apps/backend/src/server/routes/contact.ts` | `yes` |
| GET | `/api/companies-house/search` | Search Companies House records | `apps/backend/src/server/routes/companies-house.ts` | `yes` |
| GET | `/api/companies-house/company/:number` | Fetch Companies House company profile | `apps/backend/src/server/routes/companies-house.ts` | `yes` |
| GET | `/api/ideal-postcodes-key` | Return Ideal Postcodes API key/config | `apps/backend/src/server/routes/ideal-postcodes.ts` | `yes` |
| POST | `/api/quiz/submit` | Submit quiz answers | `apps/backend/src/server/routes/quiz.ts` | `yes` |
| GET | `/api/quiz/stats` | Fetch quiz aggregate stats | `apps/backend/src/server/routes/quiz.ts` | `no` |
| GET | `/api/address` | Address route root check | `apps/backend/src/server/routes/address.ts` | `yes` |
| GET | `/api/address/debug` | Address lookup debug info | `apps/backend/src/server/routes/address.ts` | `no` |
| GET | `/api/address/lookup` | Address lookup endpoint | `apps/backend/src/server/routes/address.ts` | `yes` |

## Internal

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| POST | `/api/internal/from-onedrive` | Internal worker import from OneDrive | `apps/backend/src/server/routes/internalMailImport.ts` | `no` |
| PATCH | `/api/internal/from-onedrive/:mailId/scan-url` | Internal patch/update scan URL for imported mail | `apps/backend/src/server/routes/internalMailImport.ts` | `no` |
| POST | `/api/internal/billing/run` | Internal trigger billing run | `apps/backend/src/server/routes/internal-billing.ts` | `no` |
| POST | `/api/internal/billing/generate-invoices` | Internal trigger invoice generation batch | `apps/backend/src/server/routes/internal-billing.ts` | `no` |
| GET | `/api/bff/mail/scan-url` | Authenticated PDF stream for mail scan (direct backend BFF) | `apps/backend/src/routes/bff-mail-scan.ts` | `no` |

## Debug/Dev

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/auth/test-db` | Dev-only DB connectivity check | `apps/backend/src/server/routes/auth.ts` | `no` |
| GET | `/api/auth/test-user-table` | Dev-only user table existence check | `apps/backend/src/server/routes/auth.ts` | `no` |
| GET | `/api/auth/user-table-schema` | Dev-only user table schema dump | `apps/backend/src/server/routes/auth.ts` | `no` |
| GET | `/api/auth/debug-env` | Dev-only auth env diagnostic | `apps/backend/src/server/routes/auth.ts` | `no` |
| GET | `/api/auth/debug-user/:email` | Dev-only inspect user by email | `apps/backend/src/server/routes/auth.ts` | `no` |
| POST | `/api/auth/debug-update-password` | Dev-only force password update helper | `apps/backend/src/server/routes/auth.ts` | `no` |
| POST | `/api/auth/test-email` | Dev-only test email send | `apps/backend/src/server/routes/auth.ts` | `no` |
| POST | `/api/dev/seed-user` | Dev seed user/test data | `apps/backend/src/server/routes/dev.ts` | `no` |
| POST | `/api/dev/trigger` | Dev trigger background/dev action | `apps/backend/src/server/routes/dev.ts` | `no` |
| POST | `/api/dev/cleanup` | Dev cleanup seeded/test data | `apps/backend/src/server/routes/dev.ts` | `no` |
| GET | `/api/debug/forwarding-address` | Debug forwarding address data for user | `apps/backend/src/server/routes/debug.ts` | `no` |
| GET | `/api/debug/export-jobs/ping` | Debug export-job health ping | `apps/backend/src/server/routes/debug.ts` | `no` |
| POST | `/api/debug/export-jobs/run-once` | Debug run export job once | `apps/backend/src/server/routes/debug.ts` | `no` |
| POST | `/api/debug-email` | Debug endpoint to send template email | `apps/backend/src/server/routes/debug-email.ts` | `no` |

## Migration

Non-production only: `migrateRouter` from `apps/backend/src/routes/migrate.ts` is mounted at `/api` in `apps/backend/src/app.ts` when `NODE_ENV !== 'production'`.

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| POST | `/api/migrate/run` | Run migration batch | `apps/backend/src/routes/migrate.ts` | `no` |
| GET | `/api/migrate/status` | Get migration status/flags | `apps/backend/src/routes/migrate.ts` | `no` |
| POST | `/api/migrate/fix-columns` | Apply column-fix migration patch | `apps/backend/src/routes/migrate.ts` | `no` |

## Ops/Health

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| GET | `/api/__version` | Return deployment/build metadata | `apps/backend/src/app.ts` | `no` |
| GET | `/api/health` | Full health check | `apps/backend/src/server/routes/health.ts` | `yes` |
| GET | `/api/healthz` | Minimal liveness health check | `apps/backend/src/server/routes/health.ts` | `yes` |
| GET | `/api/healthz/` | Same as `/api/healthz` (trailing slash) | `apps/backend/src/server/routes/health.ts` | `yes` |
| GET | `/api/healthz/ready` | Readiness-style JSON probe | `apps/backend/src/server/routes/health.ts` | `no` |
| GET | `/api/healthz/live` | Liveness JSON probe with uptime | `apps/backend/src/server/routes/health.ts` | `no` |
| GET | `/api/healthz/status-guard` | Health check for status-guard dependency | `apps/backend/src/server/routes/health.ts` | `yes` |
| GET | `/api/healthz/metrics` | Health/metrics readiness endpoint | `apps/backend/src/server/routes/health.ts` | `yes` |
| GET | `/api/metrics/` | Serve metrics endpoint | `apps/backend/src/server/routes/metrics.ts` | `yes` |
| GET | `/api/metrics/json` | Serve metrics in JSON form | `apps/backend/src/server/routes/metrics.ts` | `no` |
| GET | `/api/ops/heartbeat` | Authenticated heartbeat endpoint | `apps/backend/src/server/routes/ops-selftest.ts` | `yes` |
| POST | `/api/ops/self-test` | Trigger self-test run | `apps/backend/src/server/routes/ops-selftest.ts` | `yes` |
| GET | `/api/ops/self-test/status` | Read self-test status/results | `apps/backend/src/server/routes/ops-selftest.ts` | `no` |

## Other

| Method | Full Path | Purpose | Source | Frontend Connected |
|---|---|---|---|---|
| POST | `/api/csp-report/` | Receive CSP violation reports | `apps/backend/src/app.ts` | `no` |
