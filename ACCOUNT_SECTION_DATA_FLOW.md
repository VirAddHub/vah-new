# Account Section Data Flow Documentation

## Overview
This document explains how user edits in the Account page flow from the UI to the database, including all endpoints, data transformations, and safety guarantees.

---

## 1. FORWARDING ADDRESS UPDATE

### User Action:
User clicks "Edit forwarding address" → enters/selects address → clicks "Save address"

### Data Flow:
```
Frontend Component (ForwardingAddressCard.tsx)
  ↓
handleSave() calls onSave(address)
  ↓
Account Page (page.tsx) handleSaveAddress()
  ↓
PATCH /api/bff/profile
  Body: { forwarding_address: "123 Main St\nLondon\nSW1A 1AA" }
  ↓
BFF Route (apps/frontend/app/api/bff/profile/route.ts)
  - Forwards request to BACKEND_API_ORIGIN/api/profile
  - Includes Cookie header (session credentials)
  ↓
Backend Route (apps/backend/src/server/routes/profile.ts)
  PATCH /api/profile
  ↓
Database UPDATE
  UPDATE "user"
  SET forwarding_address = $1, updated_at = $2
  WHERE id = $3
  ↓
Returns updated user row
  ↓
Frontend refreshes SWR cache
  - mutateProfile()
  - mutateUser()
```

### Database Field Updated:
- `user.forwarding_address` (TEXT) - Stores multiline address string

### Safety:
- ✅ Only updates `forwarding_address` field
- ✅ Never touches `address_line1`, `address_line2`, `city`, `postal_code`, `country` (registered office)
- ✅ Uses parameterized queries (SQL injection safe)

---

## 2. BUSINESS CONTACT INFORMATION UPDATE

### User Action:
User edits first_name, last_name, middle_names, phone, email → clicks "Save changes"

### Data Flow:
```
Frontend Component (BusinessContactCard.tsx)
  ↓
handleSave() calls onSave(contact)
  ↓
Account Page (page.tsx) handleSaveContact()
  ↓
PATCH /api/bff/profile
  Body: {
    first_name: "John",
    middle_names: "James",
    last_name: "Smith",
    phone: "+44 20 1234 5678",
    email: "john@example.com"  // ⚠️ BLOCKED by backend
  }
  ↓
BFF Route (apps/frontend/app/api/bff/profile/route.ts)
  - Forwards to BACKEND_API_ORIGIN/api/profile
  - Includes Cookie header
  ↓
Backend Route (apps/backend/src/server/routes/profile.ts)
  PATCH /api/profile
  - Checks if email is provided → REJECTS with 400 error
  - Checks if middle_names column exists (graceful degradation)
  ↓
Database UPDATE
  UPDATE "user"
  SET 
    first_name = $1,
    last_name = $2,
    middle_names = $3,  -- Only if column exists
    phone = $4,
    updated_at = $5
  WHERE id = $6
  ↓
Returns updated user row
  ↓
Frontend refreshes SWR cache
  - mutateProfile()
  - mutateUser()
  - mutateOverview()
```

### Database Fields Updated:
- `user.first_name` (TEXT)
- `user.last_name` (TEXT)
- `user.middle_names` (TEXT) - Only if column exists (graceful degradation)
- `user.phone` (TEXT)
- `user.updated_at` (BIGINT) - Timestamp

### Safety:
- ✅ Email updates are BLOCKED (requires verification flow)
- ✅ Only updates provided fields (partial updates supported)
- ✅ Never touches registered office address fields
- ✅ Never touches mandate/payment fields
- ✅ Never touches KYC/verification fields
- ✅ Graceful handling if `middle_names` column doesn't exist

---

## 3. BILLING ACTIONS

### A) Reactivate Subscription

#### User Action:
User clicks "Reactivate subscription" (only shown when status is cancelled/past_due)

#### Data Flow:
```
AccountBillingCard.tsx handleReactivate()
  ↓
POST /api/bff/payments/subscription
  Body: { action: "reactivate" }
  ↓
BFF Route (apps/frontend/app/api/bff/payments/subscription/route.ts)
  - Forwards to BACKEND_API_ORIGIN/api/payments/subscriptions
  - Includes Cookie header
  ↓
Backend Route (apps/backend/src/server/routes/payments.ts)
  POST /api/payments/subscriptions
  ↓
Database UPDATE
  UPDATE "user"
  SET plan_status = 'active', updated_at = $1
  WHERE id = $2
  ↓
Returns { ok: true, status: 'active' }
  ↓
Frontend refreshes SWR cache
  - mutateOverview()
  - onRefresh() callback
```

#### Database Fields Updated:
- `user.plan_status` → 'active'

#### Safety:
- ✅ Only updates `plan_status` (doesn't touch mandate fields)
- ✅ Requires authentication (JWT middleware)

---

### B) Update Bank Details

#### User Action:
User clicks "Update bank details" (only shown when mandate exists)

#### Data Flow:
```
AccountBillingCard.tsx handleUpdateBank()
  ↓
POST /api/bff/billing/update-bank
  ↓
BFF Route (apps/frontend/app/api/bff/billing/update-bank/route.ts)
  - Forwards to BACKEND_API_ORIGIN/api/billing/update-bank
  - Includes Cookie header
  ↓
Backend Controller (apps/backend/src/server/controllers/billing.ts)
  postUpdateBank()
  - Calls gcCreateUpdateBankLink(userId)
  - Returns GoCardless secure flow URL
  ↓
Returns { ok: true, data: { url: "https://pay.gocardless.com/..." } }
  ↓
Frontend opens URL in new window (secure GoCardless flow)
  - window.open(url, '_blank', 'noopener,noreferrer')
```

#### Database Fields Updated:
- **None directly** - GoCardless handles update via secure flow
- Webhooks may update `user.gocardless_mandate_id` if mandate changes

#### Safety:
- ✅ Opens in secure GoCardless window (no direct database writes)
- ✅ Requires authentication
- ✅ Only available if user has existing mandate

---

### C) Re-authorise Direct Debit

#### User Action:
User clicks "Re-authorise Direct Debit" (only shown when mandate exists)

#### Data Flow:
```
AccountBillingCard.tsx handleReauthorise()
  ↓
POST /api/bff/billing/reauthorise
  ↓
BFF Route (apps/frontend/app/api/bff/billing/reauthorise/route.ts)
  - Forwards to BACKEND_API_ORIGIN/api/billing/reauthorise
  - Includes Cookie header
  ↓
Backend Controller (apps/backend/src/server/controllers/billing.ts)
  postReauthorise()
  - Calls gcCreateReauthoriseLink(userId)
  - Returns GoCardless secure flow URL
  ↓
Returns { ok: true, data: { url: "https://pay.gocardless.com/..." } }
  ↓
Frontend opens URL in new window (secure GoCardless flow)
```

#### Database Fields Updated:
- **None directly** - GoCardless handles reauthorisation via secure flow
- Webhooks may update mandate status if reauthorisation completes

#### Safety:
- ✅ Opens in secure GoCardless window (no direct database writes)
- ✅ Requires authentication
- ✅ Only available if user has existing mandate

---

## 4. DATA FETCHING (Read-Only)

### Account Page Load:
```
Account Page (page.tsx)
  ↓
Multiple SWR hooks fetch in parallel:
  - /api/bff/account (aggregates data)
  - /api/bff/billing/overview (subscription status)
  - /api/bff/billing/invoices (invoice list)
  - /api/auth/whoami (user data)
  - /api/bff/profile (profile data)
  ↓
BFF Routes forward to backend with cookies
  ↓
Backend Routes query database:
  - GET /api/profile → SELECT from "user" table
  - GET /api/billing/overview → SELECT from "user" + "subscription" tables
  - GET /api/billing/invoices → SELECT from "invoices" table
  - GET /api/auth/whoami → SELECT from "user" table
  ↓
Data combined in useMemo() to build AccountPageData
```

### Database Tables Read:
- `user` - Contact info, addresses, subscription status, mandate info
- `subscription` - Plan details, mandate_id, customer_id, status, cadence
- `invoices` - Payment history, PDF paths, amounts, dates

### BFF Aggregation:
The `/api/bff/account` endpoint aggregates data from multiple backend endpoints:
- Fetches billing overview, invoices, user data, and profile in parallel
- Transforms data into `AccountPageData` structure
- Handles missing data gracefully (fallbacks to empty arrays/null)

---

## 5. FIELDS THAT ARE NEVER UPDATED

### Protected Fields (Display-Only):
- `user.address_line1`, `address_line2`, `city`, `postal_code`, `country` - Registered office (immutable)
- `user.gocardless_mandate_id` - Only updated by GoCardless webhooks
- `user.gocardless_customer_id` - Only updated by GoCardless webhooks
- `user.gocardless_redirect_flow_id` - Only updated during payment setup
- `user.kyc_status`, `kyc_verified_at` - Verification data (admin-only or webhook-driven)
- `user.companies_house_verified` - CH verification status (admin-only)
- `user.email` - Blocked in profile endpoint (requires verification flow)
- `user.plan_id` - Set during signup/payment setup (not editable via profile)

### Source of Truth:
- **Mandate data**: GoCardless webhooks → `user.gocardless_mandate_id`
- **Customer ID**: GoCardless webhooks → `user.gocardless_customer_id`, `subscription.customer_id`
- **Registered office**: Set during signup/company registration (never changes)
- **KYC status**: Set by Sumsub webhooks/admin actions
- **Subscription status**: Set by webhooks when mandate confirmed, or by reactivate action

---

## 6. ENDPOINT SUMMARY

### Frontend → BFF → Backend Flow:

| Frontend Action | BFF Route | Backend Route | Method | Database Impact |
|----------------|-----------|---------------|--------|----------------|
| Edit forwarding address | `PATCH /api/bff/profile` | `PATCH /api/profile` | UPDATE | `user.forwarding_address` |
| Edit contact info | `PATCH /api/bff/profile` | `PATCH /api/profile` | UPDATE | `user.first_name`, `user.last_name`, `user.middle_names`*, `user.phone` |
| Reactivate subscription | `POST /api/bff/payments/subscription` | `POST /api/payments/subscriptions` | UPDATE | `user.plan_status` |
| Update bank details | `POST /api/bff/billing/update-bank` | `POST /api/billing/update-bank` | External | GoCardless flow (webhook updates) |
| Re-authorise mandate | `POST /api/bff/billing/reauthorise` | `POST /api/billing/reauthorise` | External | GoCardless flow (webhook updates) |
| View account data | `GET /api/bff/account` | Multiple (aggregated) | SELECT | Read-only |
| View billing overview | `GET /api/bff/billing/overview` | `GET /api/billing/overview` | SELECT | Read-only |
| View invoices | `GET /api/bff/billing/invoices` | `GET /api/billing/invoices` | SELECT | Read-only |
| View profile | `GET /api/bff/profile` | `GET /api/profile` | SELECT | Read-only |

*`middle_names` only updated if column exists in database

---

## 7. BACKEND PROFILE ENDPOINT DETAILS

### GET /api/profile
**Location**: `apps/backend/src/server/routes/profile.ts` (line 60)

**Query**:
```sql
SELECT
  id, email, status as state,
  first_name, last_name,
  middle_names,  -- Only if column exists (checked dynamically)
  phone, company_name,
  address_line1, address_line2, city, state, postal_code, country,
  forwarding_address,
  kyc_status, kyc_verified_at_ms,
  companies_house_verified,
  plan_id, subscription_status,
  created_at, updated_at, last_login_at
FROM "user"
WHERE id = $1
```

**Returns**: Full user profile with compliance status

---

### PATCH /api/profile
**Location**: `apps/backend/src/server/routes/profile.ts` (line 171)

**Accepted Fields**:
- `first_name` (TEXT) - ✅ Updates database
- `last_name` (TEXT) - ✅ Updates database
- `middle_names` (TEXT) - ✅ Updates database (if column exists)
- `phone` (TEXT) - ✅ Updates database
- `name` (TEXT) - ✅ Updates database (legacy field)
- `company_name` (TEXT) - ✅ Updates database
- `forwarding_address` (TEXT) - ✅ Updates database
- `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country` - ✅ Updates database (but frontend never sends these)
- `email` - ❌ BLOCKED (returns 400 error)

**Update Logic**:
1. Checks if `email` is provided → rejects with 400
2. Checks if `middle_names` column exists (information_schema query)
3. Builds dynamic UPDATE statement with only provided fields
4. Always updates `updated_at` timestamp
5. Uses parameterized queries (SQL injection safe)

**SQL Generated** (example):
```sql
UPDATE "user"
SET 
  first_name = $1,
  last_name = $2,
  middle_names = $3,  -- Only if column exists
  phone = $4,
  updated_at = $5
WHERE id = $6
RETURNING *
```

---

## 8. BFF ROUTES (Frontend API Proxies)

### Purpose:
BFF (Backend For Frontend) routes act as secure proxies that:
- Forward requests to backend with proper cookie handling
- Normalize response formats
- Handle errors gracefully
- Provide same-origin endpoints (avoids CORS issues)

### BFF Routes Created:

#### `/api/bff/profile` (GET & PATCH)
**File**: `apps/frontend/app/api/bff/profile/route.ts`

**GET**:
- Forwards to `BACKEND_API_ORIGIN/api/profile`
- Includes Cookie header
- Returns profile data

**PATCH**:
- Forwards request body to `BACKEND_API_ORIGIN/api/profile`
- Includes Cookie header
- Returns updated profile data

---

#### `/api/bff/billing/update-bank` (POST)
**File**: `apps/frontend/app/api/bff/billing/update-bank/route.ts`

- Forwards to `BACKEND_API_ORIGIN/api/billing/update-bank`
- Returns GoCardless secure flow URL
- Frontend opens URL in new window

---

#### `/api/bff/billing/reauthorise` (POST)
**File**: `apps/frontend/app/api/bff/billing/reauthorise/route.ts`

- Forwards to `BACKEND_API_ORIGIN/api/billing/reauthorise`
- Returns GoCardless secure flow URL
- Frontend opens URL in new window

---

#### `/api/bff/payments/subscription` (POST)
**File**: `apps/frontend/app/api/bff/payments/subscription/route.ts`

- Forwards to `BACKEND_API_ORIGIN/api/payments/subscriptions`
- Accepts `{ action: "reactivate" | "cancel" }`
- Returns subscription status

---

#### `/api/bff/account` (GET)
**File**: `apps/frontend/app/api/bff/account/route.ts`

- Aggregates data from multiple backend endpoints:
  - `/api/billing/overview`
  - `/api/billing/invoices`
  - `/api/auth/whoami`
  - `/api/profile`
- Transforms into `AccountPageData` structure
- Returns unified account data

---

## 9. ERROR HANDLING

### Frontend Error Handling:
- All API calls wrapped in try/catch blocks
- Toast notifications for success/error states
- Loading states during API calls (`isLoading` state)
- SWR automatic retry on failure
- Graceful degradation if endpoints fail

### Backend Error Handling:
- **Parameterized queries** - SQL injection safe
- **Authentication required** - JWT middleware on all routes
- **Field validation** - Checks for `undefined` before updating
- **Database error handling** - Proper status codes (400, 404, 500)
- **Graceful degradation** - `middle_names` column check before update
- **Email protection** - Explicitly blocks email updates

### Error Responses:
- `400 Bad Request` - Invalid input, email change attempted
- `401 Unauthorized` - Missing/invalid JWT token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Database error

---

## 10. AUTHENTICATION & AUTHORIZATION

### Authentication Flow:
1. User logs in → receives JWT token
2. Token stored in httpOnly cookie (set by backend)
3. BFF routes forward Cookie header to backend
4. Backend `authenticateJWT` middleware extracts token
5. `req.user.id` set from token payload
6. All profile updates scoped to authenticated user

### Authorization:
- Users can only update their own profile (`WHERE id = $userId`)
- No admin privileges required for profile updates
- Email changes blocked (requires separate verification flow)

---

## 11. DATA TRANSFORMATIONS

### Frontend → Backend:
- Contact info: `BusinessContactInfo` type → Backend expects `first_name`, `last_name`, `middle_names`, `phone`
- Forwarding address: `Address` type with `formatted` string → Backend expects `forwarding_address` (TEXT)
- Billing actions: Frontend sends `{ action: "reactivate" }` → Backend processes action

### Backend → Frontend:
- Profile data: Database row → `AccountPageData` structure
- Invoices: Database rows → `InvoiceRow[]` with formatted labels
- Subscription: Database fields → `SubscriptionSummary` with status badges

### Transformations in Account Page:
```typescript
// Invoices transformation
invoiceRows = invoicesRaw.map((inv) => ({
  invoice_no: inv.invoice_number || inv.id?.toString() || 'N/A',
  total_label: inv.amount_pence ? `£${(inv.amount_pence / 100).toFixed(2)}` : '£0.00',
  status: inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : inv.status === 'failed' ? 'failed' : 'not_paid',
  date_label: inv.date ? new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A',
  download_url: inv.pdf_url || `/api/bff/billing/invoices/${inv.id}/download`
}));
```

---

## 12. SAFETY GUARANTEES

### ✅ Data Integrity:
- **No accidental data loss**: Only specified fields are updated (partial updates)
- **No mandate overwrites**: Mandate fields are never touched by profile updates
- **No address overwrites**: Registered office fields are display-only
- **Email protection**: Email changes are blocked (requires verification)
- **Parameterized queries**: All SQL uses parameterized statements (SQL injection safe)

### ✅ Authentication:
- **JWT required**: All endpoints require authentication
- **User scoping**: Users can only update their own data (`WHERE id = $userId`)
- **Cookie forwarding**: BFF routes properly forward session cookies

### ✅ Error Handling:
- **Graceful degradation**: `middle_names` handled if column doesn't exist
- **Clear error messages**: Backend returns descriptive error responses
- **Frontend feedback**: Toast notifications for all user actions

### ✅ Business Logic:
- **Reactivate only when needed**: Button only shows for cancelled/past_due subscriptions
- **Mandate actions only when available**: Update bank/reauthorise only shown if mandate exists
- **No PSC verification yet**: Owners section is informational only (no backend)

---

## 13. COMPLETE FILE REFERENCE

### Frontend Files:
- `apps/frontend/app/(dashboard)/account/page.tsx` - Main account page
- `apps/frontend/components/account/AccountBillingCard.tsx` - Billing actions
- `apps/frontend/components/account/BusinessContactCard.tsx` - Contact info editor
- `apps/frontend/components/account/ForwardingAddressCard.tsx` - Address editor
- `apps/frontend/components/account/OwnersCard.tsx` - PSC display (informational)
- `apps/frontend/components/account/InvoicesCard.tsx` - Invoice list
- `apps/frontend/app/api/bff/profile/route.ts` - Profile BFF proxy
- `apps/frontend/app/api/bff/billing/update-bank/route.ts` - Update bank BFF
- `apps/frontend/app/api/bff/billing/reauthorise/route.ts` - Reauthorise BFF
- `apps/frontend/app/api/bff/payments/subscription/route.ts` - Subscription BFF
- `apps/frontend/app/api/bff/account/route.ts` - Account aggregation BFF

### Backend Files:
- `apps/backend/src/server/routes/profile.ts` - Profile GET/PATCH endpoints
- `apps/backend/src/server/routes/payments.ts` - Subscription management
- `apps/backend/src/server/routes/billing.ts` - Billing routes
- `apps/backend/src/server/controllers/billing.ts` - Billing controllers (update-bank, reauthorise)

### Database Tables:
- `user` - User profile, addresses, subscription status, mandate info
- `subscription` - Subscription details, mandate_id, customer_id
- `invoices` - Payment history, PDF paths
- `gc_billing_request_flow` - GoCardless flow tracking
- `gc_redirect_flow` - Redirect flow tracking

---

## 14. TESTING CHECKLIST

### Forwarding Address:
- [ ] Edit address → Verify `user.forwarding_address` updated in database
- [ ] Verify registered office address unchanged
- [ ] Verify success toast appears
- [ ] Verify UI refreshes with new address

### Contact Information:
- [ ] Edit first_name, last_name → Verify database updated
- [ ] Edit phone → Verify database updated
- [ ] Edit middle_names → Verify database updated (if column exists) or graceful failure
- [ ] Try to edit email → Verify 400 error returned
- [ ] Verify success toast appears
- [ ] Verify UI refreshes with new data

### Billing Actions:
- [ ] Reactivate subscription → Verify `user.plan_status` = 'active'
- [ ] Update bank details → Verify GoCardless window opens
- [ ] Re-authorise mandate → Verify GoCardless window opens
- [ ] Verify buttons only show when appropriate (mandate exists, status is cancelled, etc.)

### Safety Checks:
- [ ] Verify registered office address never changes
- [ ] Verify mandate fields never updated by profile endpoint
- [ ] Verify email changes are blocked
- [ ] Verify only authenticated users can update their own data

---

## 15. SUMMARY TABLE

| User Action | Frontend Component | BFF Route | Backend Route | Database Table | Fields Updated | Safety |
|------------|-------------------|-----------|---------------|----------------|----------------|--------|
| Edit forwarding address | ForwardingAddressCard | PATCH /api/bff/profile | PATCH /api/profile | `user` | `forwarding_address`, `updated_at` | ✅ Only forwarding_address |
| Edit contact info | BusinessContactCard | PATCH /api/bff/profile | PATCH /api/profile | `user` | `first_name`, `last_name`, `middle_names`*, `phone`, `updated_at` | ✅ Email blocked, no address overwrites |
| Reactivate subscription | AccountBillingCard | POST /api/bff/payments/subscription | POST /api/payments/subscriptions | `user` | `plan_status`, `updated_at` | ✅ No mandate changes |
| Update bank details | AccountBillingCard | POST /api/bff/billing/update-bank | POST /api/billing/update-bank | None | GoCardless flow | ✅ External secure flow |
| Re-authorise mandate | AccountBillingCard | POST /api/bff/billing/reauthorise | POST /api/billing/reauthorise | None | GoCardless flow | ✅ External secure flow |

*`middle_names` only updated if column exists in database

---

## 16. KEY SAFETY RULES

### ⚠️ NEVER UPDATE THESE FIELDS VIA PROFILE ENDPOINT:
- `user.gocardless_mandate_id` - Only webhooks
- `user.gocardless_customer_id` - Only webhooks  
- `user.address_line1-2`, `city`, `postal_code`, `country` - Registered office (immutable)
- `user.email` - Requires verification flow
- `user.kyc_status` - Admin/webhook only
- `user.companies_house_verified` - Admin only

### ✅ SAFE TO UPDATE VIA PROFILE ENDPOINT:
- `user.first_name`
- `user.last_name`
- `user.middle_names` (if column exists)
- `user.phone`
- `user.forwarding_address`
- `user.name` (legacy field)
- `user.company_name`

### ✅ SAFE TO UPDATE VIA OTHER ENDPOINTS:
- `user.plan_status` - Via `/api/payments/subscriptions` (reactivate)
- `user.gocardless_mandate_id` - Via GoCardless webhooks only
- `user.subscription_status` - Via webhooks when mandate confirmed

---

## 17. HARDENED SAFETY GUARANTEES (Backend-Level)

### Explicit Allowlist/Denylist:
The backend `PATCH /api/profile` endpoint now uses **explicit allowlist and denylist** at the route level:

**Allowed Fields (Allowlist)**:
- `first_name`
- `last_name`
- `middle_names` (if column exists)
- `phone`
- `forwarding_address`
- `name` (legacy)
- `company_name`

**Denied Fields (Denylist)** - Returns 400 error:
- **Registered office**: `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`
- **Payment/mandate**: `gocardless_mandate_id`, `gocardless_customer_id`, `gocardless_redirect_flow_id`, `subscription_status`, `plan_id`, `plan_status`
- **Email**: `email` (requires verification flow)
- **Verification**: `kyc_status`, `kyc_verified_at`, `companies_house_verified`, `ch_verification_status`
- **System**: `id`, `created_at`, `updated_at`, `last_login_at`, `is_admin`, `role`, `status`, `password`, etc.

### Error Messages:
- Registered office fields → `{ error: 'registered_office_immutable', message: 'Registered office address cannot be changed here.' }`
- Payment fields → `{ error: 'payment_fields_immutable', message: 'Payment and mandate fields cannot be changed via profile endpoint.' }`
- Email → `{ error: 'email_change_not_allowed', message: 'Email changes require verification. Please contact support.' }`

### Frontend Hardening:
- `BusinessContactCard` never sends `email` in PATCH body (removed from JSON.stringify)
- Frontend validation ensures required fields before save

### Tests:
- `apps/backend/tests/e2e/profile-patch.test.ts` - Tests denylist enforcement and allowlist updates

---

**Last Updated**: After Account page implementation, backend profile endpoint hardening, and safety guarantee implementation
**Status**: ✅ All edits properly wired to database with backend-level safety guarantees
