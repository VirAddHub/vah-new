# VirtualAddressHub: full app audit and redesign plan

Nov 14, 2026 · 

## Summary

The app is most of the way built, but a new customer cannot currently get from signup to a working mailbox. Three faults in the core journey cause this, and all three are small code changes. Nothing in your folder has been edited; every fix and the redesign wait for your approval.

**What works today (verified with dummy data in a test copy):** login and logout, session handling, the customer mail inbox (list, read, tag, archive, restore), forwarding requests, identity-check status updates from Sumsub, business-owner invitations, certificate PDF, support tickets, password reset, admin user list, plans, invoices list and PDF, forwarding board, audit log, and access control between customers and between customers and admins.

**What stops a real customer:**

1. **Nobody new can pay.** One misplaced line makes the checkout, company search, address lookup, contact form and identity-check start all demand an active subscription, which a new customer does not have yet.
2. **Paying does not activate the account.** The Stripe callbacks never mark the user active, never assign the plan and never create the subscription record, so a paid customer is locked out after their first logout and cannot see mail.
3. **Mail cannot be recorded for a new customer.** Signup does not create the business record that incoming mail must attach to.

**Two things outside the journey also block a relaunch:**

- The database cannot be rebuilt from the migration files in the repository. The only complete schema is inside the suspended Render database.
- The backend's dependency list has been wiped in your working folder (uncommitted), so the backend does not install or build as it stands.

**Design:** the site is mid-way through an uncommitted redesign and currently shows three different looks: a black-and-white home page, cream-and-green pricing, help and login pages, and a grey-and-green dashboard. The proposal below finishes the job in one black-and-white system.

| Area | Verified | Broken | Incomplete | Blocked | Source only |
| --- | --- | --- | --- | --- | --- |
| Public website | 13 | 6 | 4 | 1 | 1 |
| Accounts and authentication | 10 | 5 | 1 | 0 | 0 |
| Onboarding and verification | 9 | 3 | 1 | 2 | 1 |
| Customer dashboard | 11 | 3 | 2 | 0 | 0 |
| Mail | 10 | 5 | 2 | 2 | 1 |
| Payments and billing | 5 | 5 | 1 | 3 | 3 |
| Administration | 9 | 5 | 7 | 1 | 2 |
| Supporting systems | 7 | 7 | 3 | 4 | 0 |
| **Total (155 checks)** | **74** | **39** | **21** | **13** | **8** |

Counts are checklist rows in the sections below. "Verified working" means it ran correctly in the test copy after the temporary test-only patches listed in the next section.

## How this was checked

Everything ran in an isolated test copy, not in your folder and not against any live service. No production system, real customer record or real credential was used. All test accounts are `@example.test` dummies.

**Test environment**

- A full copy of the project (1,402 files) with a local Postgres 16 database, the backend on port 4000 and the Next.js site on port 3000.
- Stripe, Sumsub and the mail-import worker were simulated by sending correctly signed test events to the app's own webhook endpoints with dummy secrets. Postmark, Companies House, Ideal Postcodes, OneDrive and Cloudinary were left unconfigured, so anything that needs a real reply from them is marked blocked.
- A headless Chrome captured 61 page views at desktop (1440px) and mobile (390px) widths and ran automated accessibility (axe, WCAG 2 A/AA) and SEO tag checks on each.
- All 213 backend routes and 122 frontend API routes were inventoried from source. Seven journey scripts called 117 of the backend routes and 48 of the proxy routes (the rest are marked "not called" in CHECKLIST.md), acting as an anonymous visitor, a pending customer, two active customers and an admin.

**Status words used below**

| Status | Meaning |
| --- | --- |
| Verified | Ran in the test copy and behaved correctly |
| Broken | Ran in the test copy and failed, or fails by inspection with no doubt |
| Incomplete | Partly built: placeholder data, a screen with no backend, or a backend with no screen |
| Source only | Read in code but not exercised |
| Blocked | Cannot be checked without something listed in the last section |

**Temporary patches made only in the test copy**

These were needed to get past the blocking faults and test what lies behind them. Each one corresponds to a real fix in the ranked list.

- Restored the backend's 38 dependencies and 29 dev dependencies from the lockfile.
- Narrowed the subscription check so it covers only mail and tag routes.
- Disabled rate limiting for the test run.
- Activated test customers directly in the database (status, plan, subscription row, business record).
- Added 35 database columns and corrected two column types that the code expects but no migration creates.

**The main caveat**

The test database was reconstructed from four overlapping sets of migration files plus repair scripts, because the migrations do not run cleanly on an empty database. Where a result depends on a column's exact type, it is marked blocked or noted as schema-dependent. A schema-only export from the Render database would remove this uncertainty.

**Automated test suites as found**

| Suite | Result |
| --- | --- |
| Backend unit tests (Vitest, `src/`) | 231 passed, 14 failed, 8 skipped |
| Backend Jest suites | All 51 fail to start (Jest version mismatch) |
| Frontend type check | Passes |
| Frontend lint | 0 errors, 1,008 warnings |
| Frontend Jest | 6 of 7 suites fail to parse (no Jest config) |
| Frontend production build | Blocked in the test copy only: it downloads six Google font families and the sandbox has no route to Google Fonts |

## Coverage: public website

Frontend files are under `apps/frontend`. Every public page returned 200, rendered one main heading and showed no horizontal overflow at 390px unless noted.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Home | `/` · `components/HomePage.tsx` | Render, links, CTAs, mobile, axe, SEO tags | Verified | Loads in the new black-and-white style. 17 low-contrast text elements |
| Pricing | `/pricing` · `components/PlansPage.tsx` | Render, monthly/annual toggle, CTA to signup | Verified | Works. Copy conflict: toggle says "save 25%", footnote says "save two months" (about 17%) |
| About | `/about` | Render, SEO | Verified | Only public page with a correct canonical URL |
| Help and FAQs | `/help` · `components/HelpPage.tsx` | Render, category nav, accordion | Verified | 17 low-contrast elements on desktop |
| Blog index | `/blog` · `components/BlogPage.tsx` | Render with zero posts | Verified | Empty state shows. No posts exist in the repo database seed |
| Blog post | `/blog/[slug]` | Publish a post via admin then open it | Blocked | Admin post creation fails in the test database (see Administration). Needs production schema |
| Legal pages | `/privacy`, `/terms`, `/kyc` | Render, headings, links | Verified | Content present. Needs your legal read before launch |
| Compliance check quiz | `/compliance-check` · `POST /api/quiz/submit` | Render, submit | Verified | Submits once the subscription-check fault is patched. Unpatched it returns 401 |
| Contact form | `/contact` · `POST /api/contact` | Submit as visitor | Broken | Returns 401 for visitors (subscription-check fault). After patch it reports "sent" even when no email provider is configured |
| Contact form accessibility | `components/ContactPage.tsx` | axe | Broken | Enquiry-type dropdown has no accessible name (critical), 7 low-contrast elements |
| Navigation and footer links | `MarketingNavigation.tsx`, `Footer.tsx` | Every internal link on the home page followed | Verified | All 12 resolve. Footer email uses `.co.uk` while the site domain is `.com` |
| Mobile menu | `MarketingNavigation.tsx` | 390px render, menu button present | Verified | Opens. No overflow on any of 10 pages tested |
| 404 page | `app/not-found.tsx` | Unknown URL | Verified | Returns 404, `noindex`, helpful links |
| Canonical URLs | `app/layout.tsx` metadata | Read tag on every page | Broken | 16 of 17 pages declare the home page as their canonical URL, which tells search engines to ignore them |
| Page titles | Per-page metadata | Read title on every page | Incomplete | Pricing, blog, plans, reset-password and three others fall back to the generic site title |
| Structured data, Open Graph | JSON-LD in layout and pages | Presence | Verified | Present on all pages |
| Sitemap and RSS | `app/sitemap.ts`, `app/feed.xml` | Source | Source only | Both exist |
| Robots | `app/robots.ts` and `public/robots.txt` | Build warning | Broken | Two competing robots definitions. Keep one |
| Favicon | none | Request | Broken | `/favicon.ico` returns 404 |
| Brand consistency | Home vs pricing, help, login | Screenshots | Incomplete | Three different visual styles and six font families in use |
| Placeholder business details | Login footer; `GET /api/support/info` | Screenshot, response | Broken | Login shows "HMRC AML · XRML00000123456" and "ICO · ZA123456"; support info returns "+44 20 1234 5678" and "123 Business Street". All look like placeholders |
| Duplicate plans page | `/plans` | Render | Incomplete | Older duplicate of pricing with no main heading. Redirect to `/pricing` |
| API docs page | `/docs/api` | Render | Incomplete | Blank: the embedded docs frame is blocked by the site's own security policy |
| Developer pages | `/dev-api-check`, `/test-mail-management` | Render | Verified | Test page returns 404. `/dev-api-check` renders and should be removed before launch |
| Image alt text | All public pages | Automated | Verified | No images missing alt text |

## Coverage: accounts and authentication

Backend files are under `apps/backend/src/server/routes`. The browser talks to the backend through proxy routes under `apps/frontend/app/api/bff`.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Signup validation | `/signup` · `POST /api/auth/signup` · `auth.ts` | Missing fields, weak password, duplicate email | Verified | Clear errors for each. Account created as `pending_payment` |
| Signup company search and address lookup | `SignupStep1/2` · Companies House and Ideal Postcodes routes | Call as a signing-up visitor | Broken | Both return 401 before payment (subscription-check fault), so the signup form's lookups fail |
| Login | `/login` · `POST /api/auth/login` | Correct and wrong password, session cookie, whoami | Verified | Works for active users. Wrong password gives a generic 401 |
| Login after signup | `auth.ts:626` | Log out and back in as a paid-but-pending user | Broken | Login only accepts `status = 'active'`. Nothing ever sets that for a new customer, so they see "invalid credentials" for a correct password |
| Logout | `POST /api/auth/logout` | Cookie cleared, whoami then 401 | Verified | Works |
| Expired or missing session | Dashboard layout, `whoami` | Open dashboard pages without a session | Verified | Redirects to `/login`. Admin pages redirect to `/admin/login` |
| Role-based access | `requireAdmin` middleware | Customer calls 16 admin endpoints; customer opens `/admin/dashboard` | Verified | All 403, page redirects to admin login |
| Customer-to-customer isolation | Mail, forwarding, invoices, tickets, owners | Second active customer requests the first one's records by ID (13 calls) | Verified | All 404 or 403. No cross-account access found |
| Password reset request | `/reset-password` · `POST /api/auth/reset-password/request` | Known and unknown email | Verified | Same neutral reply for both, token stored hashed with expiry |
| Password reset confirm | `/reset-password/confirm` | Invalid token | Verified | Rejected with a clear message. A full round trip needs the emailed link (Postmark) |
| Email change | `/account/settings` · `PATCH /api/profile/contact`, `/api/profile/me` | Start a change, bad confirm token, resend | Incomplete | Starts and stores the request. One route demands the current password and the other does not, so the password check can be bypassed |
| Email change confirm page | `/verify-email-change`, `/account/confirm-email` | Render, bad token | Verified | Shows a neutral failure. No main heading on the page |
| Rate limiting on auth | `app.ts:255-262` | Repeated calls | Broken | 30 requests per 15 minutes per IP across all auth routes including the session check, and the proxy does not pass the visitor's IP on, so all visitors share one allowance |
| Per-user rate limit | `app.ts:265` | Normal browsing of 14 dashboard pages | Broken | 200 requests per 15 minutes per user was exhausted by a single pass through the dashboard, after which every page failed |
| CSRF protection | Double-submit cookie | State-changing calls without the token | Verified | Rejected |
| Legacy admin routes | `app/api/admin/route.ts`, `app/api/admin/password-reset` | Call anonymously | Broken | Both answer 200 to anyone with stub data or a fake "reset sent" message. Delete them |

## Coverage: onboarding and verification

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Company details at signup | `SignupStep1/2` · `auth.ts:535` | Submit with company name, number, type | Verified | Stored on the user record |
| Business record creation | `account-businesses.ts` | New signup, then look for a business row | Broken | Signup creates no business. Mail import then fails with a database error because every mail item must belong to one |
| Add or switch business | `/account/businesses` · `POST /api/account/businesses` | Create and list as an active customer | Verified | Works once the account is active |
| Company details edit | `PATCH /api/profile/company-details` | Source | Source only | Route exists and is called by the settings page |
| Companies House search | `companies-house.ts` | Call with no API key | Blocked | Needs a Companies House test API key |
| Start identity check | `/account/verification` · `POST /api/kyc/start` · `kyc.ts` | Call with Sumsub unconfigured | Verified | Fails safely with "verification currently unavailable". Before payment it returns 401 (subscription-check fault) |
| Sumsub widget and token | `SumsubWidget` component | Live widget | Blocked | Needs Sumsub sandbox app token, secret and level name |
| Sumsub result callback | `POST /api/webhooks/sumsub` · `webhooks-sumsub.ts` | Signed test events: bad signature, rejected-retry, approved | Verified | Bad signature 401. Rejected sets "action required". Approved sets verified and unlocks the certificate |
| Failed check and retry | `GET /api/profile/compliance` | State after a rejected event | Verified | Dashboard shows "Verification required" with a button to complete verification. The rejection reason was not stored in the test database (schema-dependent) |
| Access before verification | Mail scan URL, certificate | Request scans and certificate while pending | Verified | Mail list is visible, scan and certificate are withheld until approval |
| Customer notification on result | `insertNotification` in `webhooks-sumsub.ts` | Log after each event | Broken | Writes to a `notification` table that no migration creates. The error is swallowed, so no in-app notice appears |
| Business-owner invitation | `/business-owners` · `POST /api/business-owners` · `businessOwners.ts` | Add an owner, list, resend | Verified | Owner stored as "not started", resend accepted. Email delivery itself needs Postmark |
| Owner verification page | `/verify-owner` · `GET /api/business-owners/verify` | Invalid token | Verified | Neutral "invalid or expired". Page has no main heading |
| Owner result callback | Sumsub event with `owner_<id>` | Signed approved event | Verified | Owner marked verified, compliance summary updates |
| Companies House identity upload | `POST /api/profile/ch-verification` and admin review queue | Source | Incomplete | Customer upload exists. The admin review queue component is not shown in the admin dashboard, and two of its unit tests fail |
| Verification page layout | `/account/verification` | Render, axe | Broken | Page has no main heading and one invalid ARIA attribute |

## Coverage: customer dashboard

Pages are under `apps/frontend/app/(dashboard)`. All were opened as an active test customer at desktop width, and four at mobile width, with no layout overflow.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Dashboard shell and navigation | `(dashboard)/layout.tsx` | Sidebar links, mobile menu button, sign out | Verified | All eight sidebar links resolve |
| Account overview | `/account/overview` | Address, plan, status, verification cards | Verified | Shows registered address, plan, price and statuses. "Next billing" shows N/A |
| Redirects | `/account`, `/billing`, `/settings`, `/settings/profile`, `/forwarding` | Open each | Verified | Each lands on the right page |
| Address details | `/account/addresses` · `GET /api/profile/registered-office-address` | Render, API | Verified | Registered address returned. It is hard-coded in the backend rather than stored per plan |
| Forwarding address edit | `PATCH /api/profile` | Save a forwarding address | Verified | Saves |
| Profile save leaks secrets | `PATCH /api/profile` · `profile.ts` | Read the save response | Broken | The response sent to the browser includes the password hash, reset-token hashes and payment-provider customer IDs |
| Proof-of-address certificate | `GET /api/profile/certificate` | Download before and after verification | Verified | Withheld while pending, valid PDF after approval |
| Business switching | `/account/businesses` | List, create | Verified | Works. The mail list filters by the selected business |
| Business owners | `/business-owners` | Render, add | Verified | See onboarding |
| Settings | `/account/settings` | Render, contact details save, email preferences | Verified | Saves. Email change has the password-check gap noted under accounts |
| Data export request | `POST /api/gdpr-export/export/request` | Request an export | Broken | Fails with a date-format database error in the test database (schema-dependent) |
| Support page | `/account/support` · `support.ts` | Create, list, close a ticket | Verified | Works. There is no admin screen to read or answer tickets |
| Support contact details | `GET /api/support/info` | Response | Incomplete | Placeholder phone number and address |
| Notifications | `notifications.ts`, bell component | Source, missing table | Incomplete | Depends on the missing `notification` table; the mark-as-read call targets a route that does not exist |
| Anonymous account data | `GET /api/bff/account` | Call with no session | Broken | Returns 200 with placeholder account data instead of 401 |
| Accessibility | `/mail`, `/account/*` | axe | Verified | No critical issues on account pages. Mail page issues are listed under Mail |

## Coverage: mail

Traced from the scan landing in OneDrive, through the import worker, to the customer's inbox and a forwarding request reaching the admin board.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| OneDrive pickup | `vah-onedrive-worker` · Microsoft Graph | Live polling | Blocked | Needs a Microsoft test tenant, app registration and a test folder |
| Mail import endpoint | `POST /api/internal/from-onedrive` · `internalMailImport.ts` | Simulated worker call: right secret, wrong secret, customer with and without a business | Verified | Wrong secret 401. Item created for a customer with a business. Fails with a 500 for a customer without one (see onboarding) |
| Manual recording by admin | Admin "add mail" form · `POST /api/admin/mail-items` | Submit | Broken | The screen posts to a route the backend does not have (404). Mail can only arrive through OneDrive |
| Filename generator | `/admin/filename-generator` | Render, search | Verified | Produces the file name the worker expects |
| Customer sees new mail | `/mail` · `GET /api/mail-items` · `mail.ts` | List after import, unread count | Verified | Item appears with sender and tag, inbox count updates |
| Mail detail and mark as read | `GET/PATCH /api/mail-items/:id` | Open, mark read | Verified | Works |
| Scan viewing | `GET /api/mail-items/:id/scan-url` and the PDF proxy | Request before and after verification | Incomplete | Correctly withheld before verification. Afterwards returns "no file" because my test never made the worker's second call, which sets the scan link after the file is moved (correction, 14 Nov: a gap in the test, not an app fault). Still unverified until that call and a served test PDF are simulated in Phase 1 |
| Search | Search box on `/mail` | Search by sender | Verified | Client-side filter works. A separate `/api/mail-search` route is unreachable (404) |
| Tags | `POST /api/mail-items/:id/tag`, `GET /api/tags`, rename | Tag, list, rename | Verified | Works |
| Archive and restore | `PATCH /api/mail-items/:id` | Archive, list archived, restore | Verified | Works |
| Forwarding request | `POST /api/forwarding/requests` · `forwarding.ts` | Create, list, duplicate | Verified | Created and listed; appears on the admin board |
| Forwarding address mapping | `forwarding.ts` | Compare what was sent with what was stored | Broken | Recipient name is stored in address line 1 and the street in line 2. Labels printed from this would be wrong |
| Bulk forwarding | `POST /api/bff/forwarding/requests/bulk` | Call | Broken | Proxy points at a backend path that does not exist (404) |
| Free HMRC and Companies House forwarding | Tag-based fee rule | Source | Source only | Rule exists in the forwarding service. Charge creation not exercised |
| Admin updates status | `PATCH /api/admin/forwarding/requests/:id` | Move to dispatched, invalid values | Verified | Valid actions accepted, invalid rejected. Customer sees the new status |
| Dispatch logging | `POST /api/admin/mail-items/:id/log-physical-dispatch` | Call | Broken | Fails on the missing `notification` table |
| Destruction rules | `POST /api/admin/mail-items/:id/mark-destroyed`, destruction-log export | Mark too early, export CSV | Verified | Refused until 30 days after receipt; export downloads |
| Customer notifications by email | Postmark templates | Send | Blocked | Needs a Postmark sandbox server token. Without it sends are skipped silently |
| Scheduled jobs | Expiry reminders, daily summary, destruction log | Render configuration | Incomplete | Endpoints exist but nothing schedules them: Render has no cron jobs defined |
| Mail page accessibility | `/mail` | axe | Broken | Two dropdowns with no accessible name (critical) and one clickable row containing another control |

## Coverage: payments and billing

Stripe is the provider the checkout code uses. GoCardless code is still present, and the configuration default (`config/billing.ts`) is still `gocardless`.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Plans and prices | `GET /api/plans` · `/pricing`, signup toggle | Response, display | Verified | Monthly £9.99 and annual £89.99 display. The seed data also has three old tiers (Basic, Professional, Business) marked active |
| Start checkout | `POST /api/payments/stripe/checkout-session` · `stripe-checkout.ts` | Call as a new, unpaid customer | Broken | 401: the subscription check runs before checkout, so nobody without a subscription can buy one |
| Stripe hosted checkout | Stripe | Complete a test payment | Blocked | Needs Stripe test-mode secret key, publishable key, webhook secret and the monthly and annual price IDs |
| Checkout return page | `/signup/payment-return` · `GET session-status` | Source | Source only | The status lookup is not tied to the logged-in user; any session ID can be queried |
| Payment confirmed callback | `POST /api/webhooks/stripe` · `webhooks-stripe.ts` | Signed test events: checkout completed, subscription created, invoice paid; bad signature | Broken | Signature check works (bad signature 401). But the handlers only update an existing subscription row and set plan status. They never create the row, never set the plan and never activate the user |
| Account self-repair on login check | `whoami` in `auth.ts` | After the events above | Broken | The fallback that tries to create the subscription is rejected by a database rule that requires a GoCardless mandate ID for any active subscription |
| Failed payment | `invoice.payment_failed` handler | Source | Source only | Sets a failed status and timestamp. Not exercised because no subscription row exists to update |
| Cancelled subscription | `customer.subscription.deleted` handler | Source | Source only | Same limitation |
| Subscription status in dashboard | `GET /api/billing/overview`, `/api/payments/subscriptions/status` · `/account/billing` | As a hand-activated customer | Verified | Plan, price and status shown correctly |
| Manage payment method | "Manage billing" button · `POST /api/billing/update-bank` | Click path | Broken | Calls a GoCardless bank-update route, which fails. There is no Stripe customer-portal link |
| Customer invoices | `GET /api/billing/invoices`, PDF download | List, download own, download another customer's | Verified | Own list works; another customer's PDF is refused |
| Invoice generation | `POST /api/internal/billing/generate-invoices`, admin generate | No secret; admin call with missing fields | Verified | Protected by a secret; admin call validates input. Automatic monthly generation depends on a scheduled job that does not exist |
| Forwarding charges | `charge` table, £2 per item rule | Source | Incomplete | Charges are recorded for invoicing. I found no code that collects them through Stripe, and this was not exercised |
| Annual billing end to end | Annual price ID | Checkout | Blocked | Needs the Stripe annual price ID |
| Legacy GoCardless | `webhooks-gocardless.ts`, `payments.ts` | Call webhook | Verified | Webhook is disabled. Recommend removing the code and the mandate rule once Stripe is confirmed |
| Billing metrics for admin | `/api/admin/billing/metrics` | Call | Broken | Screen calls a route the backend does not have |
| Which provider is live | Render environment | Configuration | Blocked | Needs your confirmation that Stripe is the intended and only provider |

## Coverage: administration

The admin dashboard (`/admin/dashboard`) shows eight tabs: Users, Mail, Forwarding, Plans, Blog, Audit log, Invoices and Filename Generator. Around ten further admin components exist in the code but are switched off.

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Admin login and guard | `/admin/login` · `useVerifiedAdminSession` | Admin login; customer and anonymous access | Verified | Admin gets in; everyone else is redirected or receives 403 on all 16 admin endpoints tried |
| User list, filters, search, stats | Users tab · `admin-users.ts` | List, search, stats, deleted list, single user | Verified | Works. Rows show the paid-but-not-activated state clearly (plan status "Active", status "pending\_payment", "No plan") |
| Create user | "Create user" · `POST /api/admin/users` | Create | Broken | Database error: this route writes a date into a column that signup writes a number into. One of the two is wrong for any schema |
| Edit user, plan status, KYC override | `PATCH /api/admin/users/:id` | Source; UI buttons present | Source only | Not exercised after create failed. Four related unit tests fail |
| Suspend, activate, delete, restore | "More" menu | Routes present for delete and restore | Incomplete | Delete and restore exist. The older user edit form calls suspend and activate routes the backend does not have |
| Send password reset, unlock account | `POST /api/admin/users/:id/send-password-reset`, `unlock-account` | Source | Source only | Routes exist |
| Roles | `is_admin` and `role` on user | Guard behaviour | Incomplete | Only two levels exist: admin and customer. No staff or read-only role |
| Mail tab | Mail tab · `GET /api/admin/mail-items` | Render with one item present; API | Incomplete | API returns the item. The tab opened on "Needs destruction" showing zero and a loading row; "All mail" needs a recheck after the schema is settled |
| Mail item detail and edit | `/admin/mail/[id]` · `PUT /api/admin/mail-items/:id` | Open, edit subject | Verified | Opens and saves. A scan link in the edit is ignored |
| Forwarding board | Forwarding tab, `/admin/forwarding` · `CollaborativeForwardingBoard` | Render, list, status change | Verified | Shows Requested, In progress, Done columns with the test request |
| Forwarding locks | `POST .../lock`, `unlock`, `lock-status`, `locks` | Call as the UI would | Incomplete | Lock demands the admin's ID and name in the request body instead of taking them from the session, so one admin can lock as another. Unlock and status work |
| Manual forwarding board | `/admin/manual-forwarding` | Render | Incomplete | A separate browser-only board with Add, Export, Reset. Not connected to the database |
| Old forwarding queue route | `GET /api/admin/forwarding/queue` (frontend) | Call | Broken | 404 |
| Invoices | Invoices tab, `/admin/invoices/[id]` · `admin-invoices.ts` | List, search, view, download PDF | Verified | Works |
| Plans | Plans tab · `admin-plans.ts` | List, create, edit price, delete | Broken | Create and delete work. Editing a plan fails with a date-format database error (schema-dependent) |
| Blog | Blog tab · `admin-blog.ts` | List, create, categories | Broken | Create fails in the test database and the categories call returns 502. Eight columns the code uses are in no migration. Needs production schema to confirm |
| Audit log | Audit tab · `admin-audit.ts` | Render, both sub-tabs | Verified | Loads. Mail audit returns "table not available": `mail_audit` and `forward_audit` are in no migration |
| Destruction log export | "Export destruction log" | Download | Verified | CSV downloads |
| Overview, stats, growth, activity | `admin-overview.ts`, `admin-stats.ts`, `admin-metrics-growth.ts`, `admin-activity.ts` | Call each | Verified | All respond. No tab displays them: the overview cards are commented out |
| System health | `GET /api/admin/health/summary` | Call | Verified | Correctly reports email and other providers as down in the test copy |
| Switched-off sections | Analytics, Settings, Billing, Service monitoring, Web vitals components | Source | Incomplete | Call about 15 routes that do not exist (analytics, settings, transactions, cache clear, database backup, integration tests). Delete or rebuild |
| Admin accessibility | All tabs | axe | Broken | Icon-only buttons with no accessible name on Users, Forwarding and Blog tabs |
| Support tickets for staff | none | Source | Incomplete | Customers can raise tickets but there is no admin screen or route to read them |
| Ops and debug routes | `debug*.ts`, `admin-repair.ts`, `migrate.ts`, `ops-selftest.ts`, `dev.ts` | Route list | Blocked | About ten debug and repair route files are compiled into the app. Whether each is reachable in production depends on production environment settings |

## Coverage: supporting systems

| Feature | Entry point and files | What was checked | Status | Result or blocker |
| --- | --- | --- | --- | --- |
| Backend route inventory | `apps/backend/src/app.ts` | All 213 routes listed with their guards | Verified | Inventory complete. Route order is the root of the subscription-check fault (`mail.ts:100`, mounted at `app.ts:390`) |
| Frontend API routes | `apps/frontend/app/api` | All 122 mapped to their backend target | Verified | 4 point at backend paths that do not exist; 2 are anonymous legacy stubs |
| Unknown routes | Any unmatched `/api/*` path | Call | Broken | Returns 401 instead of 404, and `/api/health` always 401, which would fail an uptime check |
| Backend dependencies | `apps/backend/package.json` | Install and build | Broken | The working copy lists one dependency instead of 38 (uncommitted change). Build fails until restored from Git |
| Lockfile | `package-lock.json` | `npm ci` | Broken | Out of sync, so a clean CI install fails |
| Uncommitted work | Git index vs working tree | Compared | Incomplete | 33 tracked files changed and 64 new files, mostly the May redesign. None of it is committed or backed up |
| Database migrations | `scripts/migrate-pg.cjs`, four SQL folders | Run on an empty database | Broken | Stops at `022_concurrency_controls.sql`. 13 files never apply. 35 columns and 3 tables the code uses are created by no migration |
| Production schema | Render Postgres | Export | Blocked | Needs a schema-only export once the database is resumed. No customer rows required |
| Date column types | `user`, `plans`, `subscription`, export tables | Writes from different routes | Broken | The code writes both millisecond numbers and date strings to same-named columns in different places |
| Stripe webhook | `POST /api/webhooks/stripe` | Signature check | Verified | Rejects bad signatures. Logic faults are under Payments |
| Sumsub webhook | `POST /api/webhooks/sumsub` | Signature check, three outcomes | Verified | Works |
| Postmark | `mailer.ts`, `POST /api/webhooks/postmark` | Send with no token | Blocked | Needs a Postmark sandbox token. Two mailer test files cannot run under the current test runner |
| OneDrive webhook and worker | `POST /api/webhooks/onedrive`, worker service | Call webhook | Blocked | Needs a Microsoft test tenant. The webhook sits behind the subscription-check fault and has no secret of its own |
| Companies House, Ideal Postcodes, Cloudinary | Respective route files | Call with no keys | Blocked | Need test keys. All fail safely when unconfigured |
| Background jobs | Internal cron endpoints | Render services list | Incomplete | No cron jobs exist on Render. Invoice generation, reminders and daily summary never run |
| Environment configuration | `productionEnvValidation.ts`, `render.yaml`, `vercel.json` | Read; start with dummy values | Verified | Validation catches missing values at start-up. Billing provider default should change to Stripe |
| Hosting | Render (API, worker, database), Vercel (site) | Connector, read-only | Verified | All three Render services suspended for billing. Nothing is serving |
| CI | `.github/workflows` | Read | Incomplete | Workflows exist but would fail at install today |
| Backend tests | Vitest and Jest | Run | Broken | Vitest 231 pass and 14 fail; all 51 Jest suites fail to start |
| Frontend checks | Type check, lint, Jest, build | Run | Verified | Type check passes; lint has 0 errors and 1,008 warnings. Jest is not configured |
| Public diagnostics | `/api/metrics`, `/api/healthz/status-guard`, `/api/quiz/stats` | Call anonymously | Broken | All answer without authentication |

## Security findings that affect relaunch

Credential rotation and the incident work stay separate, as you asked. These are the code-level findings that decide whether the app is safe to switch back on. Items marked "earlier audit" were found by reading the code in the security review and were not re-tested here.

| # | Finding | Evidence | Status | Needed before relaunch |
| --- | --- | --- | --- | --- |
| S1 | Profile save returns the password hash, reset-token hashes and payment customer IDs to the browser | `PATCH /api/profile` response, test copy | Verified | Yes |
| S2 | Email address can be changed without the current password through the contact-details route | `PATCH /api/profile/contact` vs `/api/profile/me` | Verified | Yes |
| S3 | Forwarding lock accepts the admin's identity from the request body | `POST /api/admin/forwarding/requests/:id/lock` | Verified | Yes |
| S4 | Anonymous legacy admin routes in the frontend return stub data and a fake "reset sent" | `/api/admin`, `/api/admin/password-reset` | Verified | Yes, delete |
| S5 | Diagnostics open to anyone: metrics, status guard, quiz statistics, `/dev-api-check` page | Anonymous calls | Verified | Yes |
| S6 | Stripe session status can be read for any session ID by any logged-in user | `stripe-checkout.ts` | Source only | Yes |
| S7 | OneDrive webhook has no secret of its own (earlier audit H1) | `webhooks-onedrive.ts` | Source only | Yes |
| S8 | PDF proxy fetches a stored URL without restricting the host (earlier audit H2) | Frontend scan proxy | Source only | Yes |
| S9 | Debug, repair and migrate routes compiled into the app (earlier audit H3) | About ten route files | Source only | Yes, remove or prove disabled |
| S10 | Rate limits are shared across all visitors and too tight for normal use | `app.ts:255-275` | Verified | Yes, otherwise the site locks its own users out |
| S11 | Placeholder regulatory numbers shown on the login page | Screenshot | Verified | Yes, replace with your real HMRC and ICO references or remove |
| S12 | Contact form reports success when no email was sent | `contact.ts` with no provider | Verified | Yes |
| S13 | Anonymous call to the account proxy returns 200 with placeholder data | `/api/bff/account` | Verified | Before launch |
| S14 | Medium findings M1 to M8 from the earlier audit | `docs/security-audit-report.md` and my earlier review | Source only | Review each when the area is touched |

**Checked and found sound:** one customer cannot read, tag, archive, forward or download another customer's mail, invoices, tickets or owners (13 attempts, all refused). Customers cannot reach any admin endpoint (16 attempts, all 403). State-changing requests without a valid CSRF token are refused. Stripe, Sumsub and mail-import endpoints reject bad signatures or secrets. Password reset does not reveal whether an email exists and stores only a hashed token. Scans and the certificate stay locked until identity verification passes.

## Ranked fixes

Effort is a rough estimate for me working in your folder after approval: S is under an hour, M is a few hours, L is a day or more.

### Tier 1: blocks core journeys

| # | Fix | Where | Effort |
| --- | --- | --- | --- |
| 1 | Restore the backend dependency list from Git and bring the lockfile back in sync | `apps/backend/package.json`, `package-lock.json` | S |
| 2 | Commit the uncommitted redesign work to a branch so nothing is lost before changes begin | Git | S |
| 3 | Apply the subscription check only to mail, tags and forwarding routes | `mail.ts:100` | S |
| 4 | Make Stripe callbacks create the subscription, set the plan and activate the user; drop the GoCardless mandate rule; set Stripe as the default provider | `webhooks-stripe.ts`, `auth.ts` whoami, migration 045, `config/billing.ts` | M |
| 5 | Let a signed-up, unpaid user log in and land on "complete payment" instead of "invalid credentials" | `auth.ts:626`, signup and payment-return pages | M |
| 6 | Create the primary business at signup, and backfill one for any existing user without it | `auth.ts:535`, new migration | S |
| 7 | Produce one clean baseline migration from the production schema, plus migrations for the 35 columns and 3 tables the code needs | `scripts/migrations-pg`, blocked on the schema export | L |
| 8 | Settle one date format per column and fix the routes that disagree (admin create user, plan edit, data export) | `admin-users.ts`, `admin-plans.ts`, `gdpr-export.ts` | M |
| 9 | Fix forwarding address mapping so name and street land in the right fields | `forwarding.ts` | S |
| 10 | Rate limits: pass the visitor's IP through the proxy, exempt the session check, raise the per-user ceiling | `app.ts`, BFF proxy helper | S |

### Tier 2: fix before launch

| # | Fix | Where | Effort |
| --- | --- | --- | --- |
| 11 | Strip secrets from the profile save response (S1) and require the password on every email-change route (S2) | `profile.ts` | S |
| 12 | Delete the anonymous legacy admin routes, `/dev-api-check`, and debug, repair and migrate routes; put diagnostics behind admin (S4, S5, S9) | Frontend `app/api/admin`, backend debug files | M |
| 13 | Take the admin's identity from the session in forwarding locks (S3); scope Stripe session status to its owner (S6); give the OneDrive webhook a secret (S7); restrict the PDF proxy host (S8) | Listed files | M |
| 14 | Add a manual "record mail" endpoint so mail can be logged without OneDrive, and make the scan link editable | `admin-mail-items.ts` | M |
| 15 | Replace the GoCardless "Manage billing" action with a Stripe customer-portal link | `billing.ts`, `/account/billing` | S |
| 16 | Add the missing `notification` table and fix dispatch logging and mark-as-read | Migration, `notifications.ts` | S |
| 17 | Create the scheduled jobs on Render (invoices, reminders, daily summary, destruction log) | `render.yaml` | S |
| 18 | Fix the broken proxy paths: bulk forwarding, forwarding queue, billing metrics | Frontend `app/api` | S |
| 19 | Fix canonical URLs and page titles, add a favicon, keep one robots definition | `app/layout.tsx`, page metadata | S |
| 20 | Replace every placeholder: regulatory numbers, support phone and address, footer email domain, pricing saving claim | Login, `support.ts`, footer, pricing | S, needs your details |
| 21 | Contact form must fail visibly when email cannot be sent; return 404 for unknown routes; make `/api/health` public | `contact.ts`, `app.ts` | S |
| 22 | Accessibility: name the unlabeled dropdowns and icon buttons, fix nested controls, raise text contrast | Contact, mail, admin components | M, largely absorbed by the redesign |
| 23 | Repair the test suites: one runner for the backend, fix the 14 failing tests, configure frontend Jest | Test config | M |
| 24 | Retire the three legacy plans and the duplicate `/plans` page | Seed data, `app/plans` | S |

### Tier 3: can wait

| # | Fix | Where | Effort |
| --- | --- | --- | --- |
| 25 | Admin screen for support tickets | New | M |
| 26 | Staff role with fewer rights than full admin | Middleware, user table | M |
| 27 | Remove GoCardless code and the switched-off admin components and their dead routes | Backend and frontend | M |
| 28 | Collect forwarding charges through Stripe | Billing service | M |
| 29 | Reduce 1,008 lint warnings, mainly untyped values and unused variables | Frontend | L |
| 30 | Companies House identity-document review queue in admin | Admin dashboard | M |
| 31 | Fix or remove the embedded API docs page | `/docs/api` | S |
| 32 | Remove the browser-only manual forwarding board once the main board is trusted | `/admin/manual-forwarding` | S |

## Redesign proposal: premium black and white

### Where the design stands

The uncommitted May work already moved the home page, header and footer to black and white, and it is good. The rest of the product was left behind, so a visitor currently passes through three brands in one session:

| Surface | Current look |
| --- | --- |
| Home, header, footer | White, near-black type, black buttons, grey supporting text |
| Pricing, help, login, blog | Cream background, dark green, italic display type, an airmail envelope illustration |
| Signup, dashboard, admin | Light grey, green buttons and accents, a green logo |

Six font families are loaded (Inter, Poppins, DM Sans, Newsreader, Playfair Display, IBM Plex Mono). Your own `docs/site-design-audit.md` and design-system notes already call for one family and one token source. This proposal completes that plan using the home page as the reference.

### Design principles

1. **Black, white and four greys.** No brand colour. Hierarchy comes from size, weight and space.
2. **Colour only carries meaning.** A muted red for errors and destructive actions, a muted green for "verified" and "paid". Each appears only in small status badges and inline messages, always with a text label and icon so it never relies on colour alone.
3. **Two typefaces.** Inter for everything; IBM Plex Mono for addresses, reference numbers, dates in tables and amounts. Tight, heavy headlines as on the current home page.
4. **Lines before boxes.** Hairline rules and generous white space instead of shadows, tinted cards and rounded panels. Corners at 6px on controls, square on tables.
5. **One of each component.** One button set, one input, one table, one badge, one dialog, shared by the public site, dashboard and admin.
6. **Accessible by default.** Body text at 4.5:1 contrast or better, visible focus rings, 44px touch targets, every control labelled. This removes the contrast and labelling failures found in the audit.

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#0A0A0A` | Headlines, primary buttons, body text |
| Graphite | `#404040` | Secondary text |
| Slate | `#6B6B6B` | Captions and placeholders (smallest grey that passes contrast on white) |
| Line | `#E5E5E5` | Rules, borders, table dividers |
| Mist | `#F5F5F5` | Alternate sections, table headers, hover |
| Paper | `#FFFFFF` | Page and card background |
| Signal red | `#B42318` | Errors, destructive actions, failed payment |
| Signal green | `#17663A` | Verified, paid, delivered |
| Type scale | 12, 14, 16, 20, 28, 40, 64 px | Seven sizes only |
| Spacing | 4px base: 4, 8, 12, 16, 24, 32, 48, 72, 112 | All padding and gaps |
| Motion | 150ms ease-out; none when reduced motion is set | Hover, focus, dialogs |

A dark theme falls out of this almost for free by swapping Ink and Paper. I suggest building the tokens so it is possible but not shipping it in the first release.

### Public website

- **Home:** keep the current structure and headline. Replace the tilted dashboard illustration with a real screenshot of the redesigned inbox once it exists. Add a single proof strip (registered office, director's address, same-day scanning, ICO and HMRC references with your real numbers).
- **Pricing:** white page, one plan card drawn with a black rule, monthly and annual toggle with one consistent saving claim, a short "what you pay for forwarding" table, FAQ beneath.
- **Help and blog:** same layout as now, restyled: black category rail, hairline accordion, article pages in a 68-character reading column.
- **Login, signup, reset:** one centred column on white with the black logo. The envelope illustration and cream background go. Signup becomes three clear steps with a progress line: your details, your company, payment.
- **Legal pages:** reading column with a sticky contents list.
- **Header and footer:** as on the home page today, used everywhere including the dashboard's logged-out states.

### Customer dashboard

- **Shell:** white sidebar with black active marker, business switcher at the top, account menu at the bottom. Mobile gets a bottom bar with Mail, Forwarding, Account.
- **Inbox:** a dense list with sender, tag, received date in mono, unread shown by weight and a black dot. Opening an item shows the scan beside its details with three actions: Download, Forward, Archive. Empty, loading and error states designed for each list.
- **Status as a timeline:** identity check, forwarding requests and payments each show a short black-and-grey step line (Requested, In progress, Dispatched) rather than coloured pills.
- **Overview:** a first-run checklist (pay, verify identity, add owners, download certificate) that disappears when complete, then address, plan and recent mail.
- **Billing:** plan, next payment, payment method via Stripe portal, invoice table.
- **Verification:** one page that says exactly what is outstanding and for whom, with retry and resend actions.

### Admin

- **Shell:** left sidebar replacing the top tab row, with counts for items needing action. A black top bar distinguishes admin from the customer app at a glance.
- **Users:** one table with a single status column that resolves the three overlapping states into one plain label (Awaiting payment, Awaiting verification, Active, Suspended). Row opens a side panel with tabs for profile, mail, billing and audit.
- **Mail:** a "Record mail" action, a queue of today's items, and the destruction schedule as its own view.
- **Forwarding:** keep the board, restyle columns as lists with lock owner shown by initials.
- **Plans, blog, invoices, audit:** the shared table and form components, nothing bespoke.
- **New:** support inbox and a system page (provider health, scheduled jobs, last run).

### What happens to existing work

The May marketing components stay and become the reference. The cream-and-green styles, the five extra fonts, the green logo variant and roughly ten switched-off admin components are removed. `tailwind.config.js` and `globals.css` become the single source of the tokens above.

## Phased implementation and test plan

Each phase ends with something you can open and try locally, and each is a separate approval. All work stays in a local or test environment with dummy data and provider test modes. Nothing touches production or the suspended Render services.

| Phase | What gets done | Fix numbers | You can verify by | Depends on |
| --- | --- | --- | --- | --- |
| 0. Safe footing | Commit current work to a branch, restore dependencies, sync lockfile, one-command local start with a local database | 1, 2 | Running one command and seeing the site and API start | Your approval to edit files |
| 1. Core journey | Subscription check, Stripe activation, login for unpaid users, business at signup, forwarding address mapping, rate limits | 3, 4, 5, 6, 9, 10 | Signing up, paying with a Stripe test card, logging out and in, receiving a test mail item and forwarding it | Stripe test keys and price IDs |
| 2. Database baseline | One clean baseline migration, missing columns and tables, consistent date types | 7, 8, 16 | A fresh database built from migrations alone passing the journey tests | Schema-only export from Render |
| 3. Safe to relaunch | Secret leak, email-change check, legacy and debug routes, locks, webhooks, placeholders, contact form, health and 404 behaviour | 11, 12, 13, 20, 21 | A re-run of the security checks showing each finding closed | Your real HMRC, ICO and contact details |
| 4. Design system | Tokens, two fonts, shared button, input, table, badge, dialog and layout components; a component gallery page | Part of 22 | Opening the gallery page at desktop and mobile widths | Your sign-off on the redesign proposal |
| 5. Public site | Pricing, help, blog, legal, login, signup, reset restyled; canonical URLs, titles, favicon, robots | 19, 24, 31 | Clicking through every public page; automated SEO and accessibility report with no critical issues | Phase 4 |
| 6. Customer dashboard | New shell, inbox, mail detail, forwarding timeline, overview checklist, billing with Stripe portal, verification page, settings | 15, 18 | Running the full customer journey on a phone-sized and desktop window | Phases 1 and 4; Sumsub sandbox for the live widget |
| 7. Admin | New shell, users table and side panel, record mail, forwarding board, plans, blog, invoices, audit, support inbox, system page, scheduled jobs | 14, 17, 25, 26, 30, 32 | Recording a mail item by hand and following it to the customer; answering a ticket | Phases 2 and 4 |
| 8. Hardening | Test suites repaired and extended, dead code removed, lint clean-up, provider sandbox runs for Postmark, OneDrive, Companies House, Ideal Postcodes | 23, 27, 28, 29 | A green test run and a written launch checklist | Remaining provider test credentials |

Phases 0 to 3 make the existing app work. Phases 4 to 7 deliver the redesign. Phases 2 and 4 can run alongside phase 1 if the schema export arrives early.

### Test plan

**Automated, run on every change**

- Journey tests in a real browser against a local database, with Stripe and Sumsub events simulated by signed test payloads: visitor to paid customer; verification approved, rejected and retried; owner invited and verified; mail recorded, read, tagged, archived, restored, forwarded and dispatched; payment failed and subscription cancelled; password reset; email change.
- Access tests: the 13 cross-customer and 16 customer-to-admin attempts from this audit, kept as permanent regression tests, plus anonymous access to every route in the inventory.
- Migration test: build an empty database from migrations and run the journeys on it.
- Accessibility and SEO scan of every page at 390px and 1440px, failing on any critical or serious issue.
- Screenshot comparison of the component gallery and key pages so visual changes are deliberate.
- Backend unit tests on one runner, with the 14 current failures fixed or deleted with a reason.

**Manual, once per phase**

- You walk the phase's "verify by" step using a checklist I provide.
- Keyboard-only pass and a screen-reader spot check on signup, inbox and the admin users table.
- Real-device check on one iPhone and one Android phone.

**Provider sandboxes, before launch**

- Stripe test mode end to end, including a failed card and a cancellation, for both monthly and annual.
- Sumsub sandbox applicant through the embedded widget.
- Postmark sandbox server confirming every template renders and sends.
- A test OneDrive folder processed by the worker into a test customer's inbox.

**Exit criteria for relaunch**

Every row in the coverage tables is Verified or deliberately removed; every "yes" item in the security table is closed; a fresh database builds from migrations; the incident work you are handling separately is complete.

## Blocked items and what unblocks them

Please do not paste any key or password into chat. Test-mode values go into a local environment file on your computer, which I will tell you how to create when the phase starts.

| Blocked check | Exactly what is needed | Needed by |
| --- | --- | --- |
| True database structure; blog, plan edit, data export and admin create-user results | A schema-only export of the Render database (`pg_dump --schema-only`, no rows). The database must be resumed briefly to take it | Phase 2 |
| Real checkout, monthly and annual; failed and cancelled payments | Stripe **test-mode** secret key, publishable key, webhook signing secret, and the monthly and annual price IDs | Phase 1 |
| Live identity-check widget | Sumsub **sandbox** app token, secret key, webhook secret and verification level name | Phase 6 |
| Email delivery and templates | A Postmark **sandbox** server token and the sender address | Phase 3 |
| OneDrive pickup and scan viewing with a real file | A Microsoft test tenant or test folder, with app registration ID, tenant ID and secret, separate from production mail | Phase 8 |
| Company search at signup | Companies House API test key | Phase 5 |
| Address lookup at signup | Ideal Postcodes test key | Phase 5 |
| Blog image upload | Cloudinary test credentials, or a decision to store images elsewhere | Phase 7 |
| Which billing provider and code version were live | Your confirmation that Stripe is the only provider going forward, and which Git commit was last deployed | Phase 1 |
| Placeholder business details | Your real HMRC AML and ICO registration numbers, support phone, postal address and preferred email domain | Phase 3 |
| Production build of the site | Nothing from you. It builds on any machine that can reach Google Fonts; the redesign will bundle the two fonts locally so the build no longer depends on it | Phase 4 |
| Reachability of debug routes in production | Nothing from you if they are deleted in phase 3, which is my recommendation | Phase 3 |

**Decisions for you**

1. Approve phase 0 so I may start editing files, or tell me which phases to change.
2. Confirm the redesign direction, in particular the two small status colours.
3. Confirm Stripe as the sole billing provider.
