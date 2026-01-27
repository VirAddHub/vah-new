# Company Control & Additional Verification Flow - Implementation Summary

## Overview

Complete end-to-end implementation of compliance-critical identity verification flow that fully controls address access based on company structure.

---

## 1. Database Schema

### Migration: `041_add_business_owner_role_and_verification.sql`

**Changes to `business_owner` table:**
- Added `role` (TEXT NOT NULL) - Values: `'director'` | `'psc'`
- Added `requires_verification` (BOOLEAN NOT NULL DEFAULT true)
- Added `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- Renamed `kyc_id_status` → `status` for consistency
- Status values: `'not_started'` | `'pending'` | `'verified'` | `'rejected'`

---

## 2. Signup Behavior

### If user selects **YES — I'm the only director/controller:**
- ✅ No `business_owner` records created
- ✅ Only primary user must complete Sumsub verification
- ✅ Address unlocks when primary user KYC approved

### If user selects **NO — there are other directors/controllers:**
- ✅ Collect additional individuals (name, email, role)
- ✅ Create `business_owner` record for EACH person with:
  - `requires_verification = true`
  - `status = 'not_started'`
  - `role = 'director'` (default)
- ✅ Send verification email to each person
- ✅ Address remains locked until ALL verify

**Backend:** `apps/backend/src/server/routes/auth.ts` (Lines 381-395)
- Calls `createBusinessOwner()` for each additional owner during signup

---

## 3. Sumsub Integration (Additional People)

### Applicant Creation

**Service:** `apps/backend/src/server/services/businessOwners.ts`

**Function:** `createSumsubApplicantForOwner(ownerId: number)`

**How it works:**
1. Creates Sumsub applicant with `externalUserId = 'owner_{id}'` (prefix distinguishes from primary users)
2. Stores `sumsub_applicant_id` on `business_owner` record
3. Sets `status = 'pending'`
4. Generates SDK access token (TTL: 600 seconds)
5. Returns `{ applicantId, accessToken }`

**API Endpoint:** `POST /api/business-owners/verify/start`
- **Input:** `{ token: string }` (invite token from email)
- **Output:** `{ ok: true, data: { started: true, sumsubToken: string, applicantId: string } }`
- **Public endpoint** (no auth required - uses invite token)

### Verification Links

**Email sent by:** `createBusinessOwner()` in `businessOwners.ts`
- **Template:** Postmark template ID 42716349 (reusing email change verification template)
- **Link format:** `https://app.virtualaddresshub.co.uk/verify-owner?token={token}`
- **Token expiry:** 7 days
- **Resend:** `POST /api/business-owners/:id/resend`

### State Transitions

| Sumsub Outcome | Stored Status |
|----------------|---------------|
| Not started | `not_started` |
| In progress | `pending` |
| Approved (GREEN) | `verified` |
| Rejected (RED) | `rejected` |

**Status changes ONLY happen via Sumsub webhook events** (no manual overrides)

---

## 4. Webhook Handling

### File: `apps/backend/routes/webhooks-sumsub.js`

**Extended to handle both:**
1. **Primary users:** `externalUserId = user.id` (number)
2. **Business owners:** `externalUserId = 'owner_{id}'` (string with prefix)

**Resolution logic:**
```javascript
const isBusinessOwner = externalUserId && String(externalUserId).startsWith('owner_');

if (isBusinessOwner) {
  const ownerId = Number(String(externalUserId).replace('owner_', ''));
  ownerRow = await db.get('SELECT ... FROM business_owner WHERE id = $1', [ownerId]);
  // Fallback: lookup by sumsub_applicant_id
}
```

**On approval (reviewAnswer === 'GREEN'):**
- Updates `business_owner.status = 'verified'`
- Sets `kyc_updated_at = NOW()`
- Sends approval email to owner

**On rejection (reviewAnswer === 'RED'):**
- Updates `business_owner.status = 'rejected'`
- Sends rejection email with reason

**Returns:** `200 OK` (Sumsub expects 2xx even if user/owner not found)

---

## 5. Backend Compliance Enforcement (MANDATORY)

### File: `apps/backend/src/server/services/compliance.ts`

**Function:** `computeIdentityCompliance(user: UserRow): Promise<IdentityCompliance>`

**Now async** (queries database for business owners)

**Rules:**
1. `isKycApproved = user.kyc_status === 'approved' || 'verified'`
2. `allRequiredOwnersVerified = COUNT(*) WHERE requires_verification = true AND status != 'verified' === 0`
3. **`canUseRegisteredOfficeAddress = isKycApproved AND allRequiredOwnersVerified`**

**Query:**
```sql
SELECT COUNT(*) as count
FROM business_owner
WHERE user_id = $1
  AND requires_verification = true
  AND status != 'verified'
```

**Address gating:** `apps/backend/src/server/routes/profile.ts`
- `GET /api/profile/registered-office-address`
- Returns `403 KYC_REQUIRED` if `!canUseRegisteredOfficeAddress`
- Frontend NEVER decides access

**Updated calls:**
- `apps/backend/src/server/routes/profile.ts` (Line 184, 735)
- Changed from `computeIdentityCompliance(user)` to `await computeIdentityCompliance(user)`

---

## 6. Verification Page UI

### File: `apps/frontend/app/(dashboard)/account/verification/page.tsx`

**Three states:**

### State 1: **VERIFIED**
- Primary user KYC approved
- All required owners verified
- Shows: "Verification Complete" + "View Account" button

### State 2: **PENDING OTHERS**
- Primary user KYC approved
- Some owners still pending
- Shows:
  - ✅ "Your Verification Complete" card
  - ⏳ "Pending Verification" card with list of owners:
    - Name, email, status badge
    - "Resend" button (if not verified)
  - 🔒 "Address Unavailable" card

### State 3: **ACTION REQUIRED**
- Primary user KYC not approved
- Shows:
  - ⚠️ "Verification Required" card
  - Sumsub widget for primary user
  - 🔒 "Address Unavailable" card

**Data fetching:**
```typescript
const { data: ownersData } = useSWR('/api/bff/business-owners', swrFetcher);
const owners: BusinessOwner[] = ownersData?.data?.owners || [];

const pendingOwners = owners.filter(owner => 
  owner.requiresVerification && 
  owner.status !== 'verified'
);
```

**Resend functionality:**
```typescript
const handleResend = async (ownerId: string | number) => {
  await fetch(`/api/bff/business-owners/${ownerId}/resend`, { method: 'POST' });
};
```

---

## 7. API Endpoints

### Backend Routes: `apps/backend/src/server/routes/businessOwners.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/business-owners` | GET | Required | List all owners for user |
| `/api/business-owners` | POST | Required | Add new owner |
| `/api/business-owners/:id/resend` | POST | Required | Resend verification email |
| `/api/business-owners/verify` | GET | Public | Verify invite token |
| `/api/business-owners/verify/start` | POST | Public | Start Sumsub verification |

### Frontend BFF Proxies: `apps/frontend/app/api/bff/business-owners/`

| Endpoint | Method | Proxies To |
|----------|--------|------------|
| `/api/bff/business-owners` | GET | `/api/business-owners` |
| `/api/bff/business-owners` | POST | `/api/business-owners` |
| `/api/bff/business-owners/[id]/resend` | POST | `/api/business-owners/:id/resend` |

---

## 8. Success Criteria

✅ **Selecting "No — there are other directors/controllers" at signup:**
- Creates `business_owner` records
- Sends verification emails to each person
- Shows pending users in verification page
- Blocks address access

✅ **Address unlocks automatically when:**
- Primary user `kyc_status === 'approved'` AND
- ALL `business_owner` records with `requires_verification = true` have `status === 'verified'`

✅ **No frontend-only checks:**
- All compliance logic in backend
- Frontend reads `compliance.canUseRegisteredOfficeAddress` from API
- Address endpoint returns 403 if not compliant

✅ **Webhook integration:**
- Handles both primary users and business owners
- Updates status based on Sumsub events
- Sends email notifications

---

## 9. Testing Checklist

### Scenario 1: Sole Controller (YES)
1. Sign up and select "YES — I'm the only director"
2. Complete primary user KYC verification
3. ✅ Address should unlock immediately
4. ✅ No business owners created

### Scenario 2: Multiple Directors (NO)
1. Sign up and select "NO — there are other directors"
2. Add 2 directors with email addresses
3. ✅ Verification emails sent to both
4. Complete primary user KYC verification
5. ✅ Address remains locked
6. ✅ Verification page shows "Pending Verification" for 2 directors
7. Director 1 clicks email link and completes verification
8. ✅ Address still locked (1 pending)
9. Director 2 completes verification
10. ✅ Address unlocks automatically

### Scenario 3: Resend Email
1. In verification page, click "Resend" for pending owner
2. ✅ New email sent with fresh token
3. ✅ Token expires after 7 days

### Scenario 4: Rejection
1. Business owner completes verification
2. Sumsub rejects (RED)
3. ✅ Status updates to `'rejected'`
4. ✅ Rejection email sent
5. ✅ Address remains locked

---

## 10. Files Changed

### Backend
- `apps/backend/migrations/041_add_business_owner_role_and_verification.sql` (NEW)
- `apps/backend/routes/webhooks-sumsub.js` (MODIFIED)
- `apps/backend/src/server/routes/businessOwners.ts` (MODIFIED)
- `apps/backend/src/server/routes/profile.ts` (MODIFIED)
- `apps/backend/src/server/services/businessOwners.ts` (MODIFIED)
- `apps/backend/src/server/services/compliance.ts` (MODIFIED)

### Frontend
- `apps/frontend/app/(dashboard)/account/verification/page.tsx` (MODIFIED)
- `apps/frontend/app/api/bff/business-owners/[id]/resend/route.ts` (NEW)

---

## 11. Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `SUMSUB_APP_TOKEN` | Sumsub application token | Yes |
| `SUMSUB_SECRET_KEY` | Sumsub secret key | Yes |
| `SUMSUB_WEBHOOK_SECRET` | Webhook signature verification | Yes |
| `SUMSUB_LEVEL_NAME` | KYC level (default: "basic-kyc") | No |
| `SUMSUB_BASE_URL` | API base URL (default: https://api.sumsub.com) | No |

---

## 12. Known Limitations

1. **Email template:** Currently reusing email change verification template (ID: 42716349)
   - TODO: Create dedicated template for business owner verification
   
2. **Role selection:** Frontend doesn't yet allow selecting `'psc'` vs `'director'`
   - Currently defaults to `'director'` for all owners
   
3. **Manual verification:** No admin override to manually approve/reject business owners
   - All status changes must come from Sumsub webhooks

---

## 13. Security Considerations

✅ **Webhook signature verification:** HMAC SHA-256 with `SUMSUB_WEBHOOK_SECRET`

✅ **Invite token security:**
- SHA-256 hashed before storage
- 7-day expiry
- Single-use (marked as `used_at` after first use)

✅ **Address gating:**
- Backend-enforced (not frontend)
- Requires both primary KYC AND all owners verified
- No bypass mechanism

✅ **externalUserId prefix:**
- `'owner_{id}'` prefix prevents collision with primary user IDs
- Webhook handler explicitly checks prefix

---

## Conclusion

The full company control and additional verification flow is now **fully implemented and functional end-to-end**. 

Address access is strictly gated by backend compliance logic, ensuring all required individuals complete identity verification before the business address becomes available.

No frontend-only checks exist — all compliance decisions are made by the backend.
