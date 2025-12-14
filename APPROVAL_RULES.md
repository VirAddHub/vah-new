## Current user approval rules (what “approved” means)

This document describes the current backend rules that decide whether a user is treated as “approved” for core features.

### Summary

- **KYC approved**: `kyc_status` is **`approved`** or **`verified`**.
- **Can use registered office address**: **KYC approved**.
- **Certificate**: **KYC approved**.
- **Mail forwarding**: unchanged (tag-based; see below).

### 1) KYC approval

A user is considered KYC-approved when:

- `kyc_status === "approved"` **OR**
- `kyc_status === "verified"`

**Code:** `apps/backend/src/server/services/kyc-guards.ts`
- `isKycApproved(status)`

### 3) “Can use registered office address” gating

A user can view/use the registered office address when **KYC is approved**.

**Code:** `apps/backend/src/server/services/compliance.ts`
- `computeIdentityCompliance(user)` → `canUseRegisteredOfficeAddress`

**API gate:** `apps/backend/src/server/routes/profile.ts`
- `GET /api/profile/registered-office-address` returns **403** with `KYC_REQUIRED` if KYC is not approved.

### 4) Certificate (Business Address Confirmation / Letter)

Certificate download is gated by **KYC approval**:

- If KYC is not approved, the certificate endpoint returns **403** with `KYC_REQUIRED`.

**API gate:** `apps/backend/src/server/routes/profile.ts`
- `GET /api/profile/certificate`

**KYC rule:** `apps/backend/src/server/services/kyc-guards.ts`
- `isKycApproved(status)`

### 5) Mail forwarding rules

Forwarding rules are **mail-tag dependent**:

- **HMRC and Companies House mail** can be forwarded **regardless of KYC**.
- **All other mail** requires **KYC approval**.

**KYC-by-tag rule:** `apps/backend/src/server/services/kyc-guards.ts`
- `canForwardMail(kycStatus, tag)`

**Forwarding API enforcement:** `apps/backend/src/server/routes/mail-forward.ts`
- `POST /api/mail/forward`

Also enforced:

- **GDPR 30-day forwarding window**: items older than the window are blocked for non-admins.

**Code:** `apps/backend/src/server/routes/mail-forward.ts`

### Notes

- “Approved” is not a single stored flag today; it is computed from a combination of user fields.
- Different features are gated differently:
  - Address usage requires **KYC + Companies House**.
  - Certificate requires **KYC**.
  - Forwarding requires **KYC** except for HMRC/Companies House.
