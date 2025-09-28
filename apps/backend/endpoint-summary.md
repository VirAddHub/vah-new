# Backend Endpoint Summary

Generated on: 2025-09-28T02:48:05.952Z

**Total Routers:** 42
**Total Endpoints:** 152
**With Auth:** 120
**With File Upload:** 0

## ADMIN Domain

**Methods:** GET: 5, POST: 9, PATCH: 1, PUT: 2

**Special Features:** webhook

### Routes

- `GET /admin/invoices` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /admin/invoices/:id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/invoices/:id/link` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/invoices/:id/resend` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/mail-items/:id/log-physical-dispatch` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/mail-items/:id/log-physical-receipt` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/mail-items/:id/restore` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/payments/create-adhoc-link` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/payments/initiate-refund` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /admin/support` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `PATCH /admin/support/:id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/support/tickets/:id/close` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /admin/users/:user_id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `PUT /admin/users/:user_id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /admin/users/:user_id/billing-history` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /admin/users/:user_id/impersonate` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `PUT /admin/users/:user_id/kyc-status` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint

## API Domain

**Methods:** GET: 21, POST: 6, PATCH: 1, DELETE: 1, PUT: 4

### Routes

- `GET /api/admin/analytics` [auth]
- `GET /api/admin/billing/metrics` [auth]
- `GET /api/admin/forwarding/queue` [auth] - uses id parameter
- `POST /api/admin/forwarding/requests/:id/cancel` [auth] - uses id parameter
- `POST /api/admin/forwarding/requests/:id/fulfill` [auth] - uses id parameter
- `GET /api/admin/mail-items` [auth] - uses id parameter, supports query parameters, supports pagination
- `POST /api/admin/mail-items` [auth] - uses id parameter, supports query parameters, supports pagination
- `PATCH /api/admin/mail-items/:id` [auth] - uses id parameter, supports query parameters, supports pagination
- `GET /api/admin/transactions` [auth]
- `GET /api/admin/users` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `POST /api/admin/users` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `DELETE /api/admin/users/:id` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `PUT /api/admin/users/:id` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `PUT /api/admin/users/:id/activate` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `PUT /api/admin/users/:id/kyc-status` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `POST /api/admin/users/:id/restore` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `PUT /api/admin/users/:id/suspend` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `GET /api/admin/users/stats` [auth] - expects JSON body, uses id parameter, supports query parameters, supports pagination
- `GET /api/auth/ping` [rate-limit, cors, helmet] - inline route definition
- `GET /api/billing` [auth]
- `GET /api/billing` [auth]
- `POST /api/create-test-users` [rate-limit, cors, helmet] - inline route definition
- `GET /api/email-prefs` [auth]
- `GET /api/email-prefs` [auth]
- `GET /api/forwarding-requests` [auth]
- `GET /api/forwarding-requests` [auth]
- `GET /api/health` [auth]
- `GET /api/invoices` [auth]
- `GET /api/mail-items` [auth]
- `GET /api/mail-items/:id/scan-url` [auth] - uses id parameter, supports query parameters, supports pagination
- `GET /api/plans` [auth]
- `GET /api/profile` [auth]
- `GET /api/tickets` [auth]

## AUTH Domain

**Methods:** GET: 1, POST: 2

**Special Features:** webhook

### Routes

- `GET /auth/db-check` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /auth/hash-check` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /auth/logout-all` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint

## OTHER Domain

**Methods:** GET: 46, PATCH: 5, POST: 43, PUT: 4, DELETE: 1

**Special Features:** webhook, streaming

### Routes

- `GET /` [auth]
- `GET /`
- `GET /`
- `GET /` [auth]
- `PATCH /`
- `POST /` [rate-limit] - supports pagination, webhook endpoint
- `POST /`
- `POST /` [auth]
- `PUT /address` [auth]
- `GET /billing` [auth]
- `POST /business` [auth]
- `POST /company-search` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /create-admin-user` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /csrf` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /debug/db-info` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /debug/whoami` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /email-prefs` [auth]
- `POST /forward/bulk` [auth] - webhook endpoint
- `GET /forwarding-requests` [auth]
- `PUT /forwarding-requests/:id/cancel` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /forwarding-requests/usage` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /gc/redirect-flow/callback` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /gc/redirect-flow/start` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /health` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /healthz` [rate-limit, cors, helmet] - inline route definition
- `GET /invoices` [auth] - uses id parameter
- `GET /invoices` [auth]
- `GET /invoices/:id/link` [auth] - uses id parameter
- `GET /invoices/:token` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /kyc/resend-verification-link` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /kyc/start` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /kyc/status` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /kyc/upload` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /login` [auth]
- `POST /login` [auth]
- `POST /logout` [auth]
- `POST /logout` [auth]
- `GET /mail` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /mail-items` [auth]
- `GET /mail-items` - uses id parameter
- `DELETE /mail-items/:id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /mail-items/:id` - uses id parameter
- `PATCH /mail-items/:id` - uses id parameter
- `PUT /mail-items/:id` - uses id parameter
- `GET /mail-items/:id/history` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /mail-items/:id/log-physical-dispatch` - uses id parameter
- `POST /mail-items/:id/restore` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /mail-items/:id/scan-url` - uses id parameter, streaming response
- `POST /mail-items/:id/tag` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /mail/bulk-forward-request` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /mail/forward` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /mail/forward` - uses id parameter
- `GET /mail/history/:id` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /payments` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /payments/redirect-flows` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /payments/redirect-flows/:id/complete` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /payments/subscriptions` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /payments/subscriptions/status` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /ping` [auth]
- `GET /plans` - uses id parameter
- `GET /plans` [auth]
- `PATCH /plans/:id` - uses id parameter
- `GET /profile` [auth]
- `GET /profile/certificate-url` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /profile/certificate.pdf` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /profile/request-business-name-change` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /profile/reset-password` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /profile/reset-password-request` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /profile/update-password` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /redirect-flows`
- `GET /requests` - uses id parameter, supports query parameters
- `GET /requests` [auth] - uses id parameter
- `POST /requests` [auth] - uses id parameter
- `GET /requests/:id` [auth] - uses id parameter
- `PATCH /requests/:id` - uses id parameter, supports query parameters
- `POST /requests/:id/fulfill` - uses id parameter, supports query parameters
- `POST /reset-password` [auth]
- `POST /reset-password-request` [auth]
- `GET /scans/:token` - uses id parameter, streaming response
- `GET /search/mail` - supports query parameters, supports pagination
- `POST /signup` [auth]
- `POST /signup` [auth]
- `GET /status`
- `POST /subscriptions`
- `GET /subscriptions/status`
- `GET /support` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /support` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /tickets` [auth]
- `POST /tickets` - uses id parameter
- `POST /tickets/:id/close` - uses id parameter
- `POST /upload`
- `GET /users` - uses id parameter
- `PATCH /users/:id` - uses id parameter
- `PUT /users/:id/kyc-status` - uses id parameter
- `POST /webhooks-gc` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /webhooks-postmark` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `POST /webhooks/sumsub` [auth, csrf] - uses id parameter, supports query parameters, supports pagination, webhook endpoint
- `GET /whoami` [auth]
- `GET /whoami` [auth]

