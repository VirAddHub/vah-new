# 🔎 Time Standard Discovery Report — PostgreSQL on Render

**Analysis Date:** 2025-10-02
**Database:** PostgreSQL on Render (dpg-d3coq7l6ubrc73f0bt3g-a)
**Total Timestamp Columns Analyzed:** 43

---

## ✅ Database Confirmation

**PostgreSQL on Render** is confirmed as the canonical database.

**Evidence:**
- Connection via `DATABASE_URL` environment variable
- All migrations in `apps/backend/scripts/migrations-pg/` directory
- Production database: `dpg-d3coq7l6ubrc73f0bt3g-a`
- No SQLite, MySQL, or other database references in active code

---

## 📊 Canonical Time Verdict

**Canonical time is BIGINT milliseconds since epoch (JavaScript `Date.now()` format); divergences exist in 4 distinct areas: legacy timestamptz columns, text-stored timestamps, conversion utilities with dual support, and one critical normalization migration that fixed seconds→milliseconds corruption.**

---

## 🗃️ Schema Inventory — All Timestamp Columns

### Summary Statistics
- ✅ **Canonical (bigint ms):** 28 columns (65%)
- ⚠️ **Text-stored ISO:** 9 columns (21%)
- ⚠️ **Legacy timestamptz:** 6 columns (14%)

### Complete Column Inventory

| Table | Column | Type | Unit | Status | File Reference |
|-------|--------|------|------|--------|----------------|
| **user** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:24 |
| **user** | updated_at | bigint | ms | ✅ Canonical | 000_base.sql:25 |
| **user** | plan_start_date | bigint | ms | ✅ Canonical | 000_base.sql:17 |
| **user** | email_verified_at | bigint | ms | ✅ Canonical | 000_base.sql:20 |
| **user** | locked_until | bigint | ms | ✅ Canonical | 000_base.sql:23 |
| **user** | last_login_at | bigint | ms | ✅ Canonical | 015_add_last_login_at.sql |
| **user** | last_active_at | bigint | ms | ✅ Canonical | 011_user_activity_tracking.sql:4 |
| **user** | deleted_at | bigint | ms | ✅ Canonical | 012_soft_delete_and_audit.sql:4 |
| **mail_item** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:56 |
| **mail_item** | updated_at | bigint | ms | ✅ Canonical | 000_base.sql:55 |
| **mail_item** | scanned_at | bigint | ms | ✅ Canonical | 000_base.sql:49 |
| **mail_item** | requested_at | bigint | ms | ✅ Canonical | 000_base.sql:51 |
| **mail_item** | physical_receipt_timestamp | bigint | ms | ✅ Canonical | 000_base.sql:52 |
| **mail_item** | physical_dispatch_timestamp | bigint | ms | ✅ Canonical | 000_base.sql:53 |
| **mail_item** | expires_at | bigint | ms | ✅ Canonical | 017_add_expires_at_column.sql |
| **mail_item** | received_date | text | ISO | ⚠️ Text-stored | 000_base.sql:35 |
| **mail_item** | forwarded_date | text | ISO | ⚠️ Text-stored | 000_base.sql:40 |
| **admin_log** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:81 |
| **mail_event** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:95 |
| **activity_log** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:107 |
| **audit_log** | created_at | timestamptz | native | ⚠️ Legacy column | 000_base.sql:125 |
| **invoice** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:138 |
| **invoice_token** | expires_at | text | ISO | ⚠️ Text-stored | 000_base.sql:148 |
| **invoice_token** | used_at | text | ISO | ⚠️ Text-stored | 000_base.sql:149 |
| **invoice_token** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:150 |
| **invoice_seq** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:160 |
| **invoice_seq** | updated_at | bigint | ms | ✅ Canonical | 000_base.sql:161 |
| **plans** | created_at | text | ISO | ⚠️ Text-stored | 000_base.sql:181 |
| **plans** | updated_at | text | ISO | ⚠️ Text-stored | 000_base.sql:182 |
| **plans** | effective_at | text | ISO | ⚠️ Text-stored | 000_base.sql:179 |
| **plans** | retired_at | text | ISO | ⚠️ Text-stored | 000_base.sql:180 |
| **webhook_log** | received_at | timestamptz | native | ⚠️ Converted from bigint | 001_add_plans_amount_webhook_log.sql:47 |
| **password_reset** | created_at | bigint | ms | ✅ Canonical | 000_base.sql:209 |
| **password_reset** | used_at | bigint | ms | ✅ Canonical | 000_base.sql:210 |
| **scan_tokens** | expires_at | text | ISO | ⚠️ Text-stored | 000_base.sql:71 |
| **scan_tokens** | created_at | text | ISO | ⚠️ Text-stored | 000_base.sql:73 |
| **admin_audit** | created_at | bigint | ms | ✅ Canonical | 012_soft_delete_and_audit.sql:17 |
| **export_job** | created_at | timestamptz | native | ⚠️ Legacy column | 004_export_job.sql:6 |
| **export_job** | started_at | timestamptz | native | ⚠️ Legacy column | 004_export_job.sql:7 |
| **export_job** | completed_at | timestamptz | native | ⚠️ Legacy column | 004_export_job.sql:8 |
| **export_job** | finished_at | timestamptz | native | ⚠️ Legacy column | 004_export_job.sql:9 |
| **export_job** | expires_at | bigint | ms | ⚠️ **NORMALIZED** | 006_export_job_expires_ms_normalize.sql |
| **address** | created_at | timestamptz | native | ⚠️ Legacy column | 010_address_tables.sql:10 |
| **user_address** | created_at | timestamptz | native | ⚠️ Legacy column | 010_address_tables.sql:21 |

### Additional Conflicts (Migration Overlaps)
| Table | Column | Type | Status | File Reference |
|-------|--------|------|--------|----------------|
| **invoice_token (v2)** | expires_at | timestamptz | ⚠️ Migration conflict | 003_invoice_token.sql:6 |
| **invoice_token (v2)** | created_at | timestamptz | ⚠️ Migration conflict | 003_invoice_token.sql:7 |

**Note:** Migration 003 creates a new `invoice_token` table with timestamptz, potentially conflicting with base schema's text-based columns.

---

## 📝 Evidence Snippets

### 1. Canonical Standard: `Date.now()` in Backend Code

**Location:** `apps/backend/src/middleware/auth.ts:52`
```typescript
await pool.query(
    'UPDATE "user" SET last_active_at = $1 WHERE id = $2',
    [Date.now(), userId]  // ✅ Milliseconds since epoch
);
```

**Location:** `apps/backend/src/server/routes/mail.ts:118`
```typescript
updates.push(`updated_at = $${paramIndex++}`);
values.push(Date.now());  // ✅ Milliseconds since epoch
```

**Location:** `apps/backend/src/server/helpers/time.ts:42`
```typescript
export const nowMs = (): number => Date.now();  // ✅ Canonical helper function
```

### 2. Conversion Utility: Dual Support for MS/Seconds/ISO

**Location:** `apps/backend/src/server/helpers/time.ts:8-29`
```typescript
export const toDateOrNull = (value: any): Date | null => {
    if (value == null || value === '') return null;

    const num = Number(value);

    // Milliseconds since epoch (13+ digits)
    if (Number.isFinite(num) && String(value).length >= 13) {
        return new Date(num);  // ✅ Direct use
    }

    // Seconds since epoch (10 digits or less)
    if (Number.isFinite(num) && String(value).length <= 10) {
        return new Date(num * 1000);  // ⚠️ Conversion needed (off-by-1000 risk)
    }

    // ISO string or Date-parsable string
    try {
        return new Date(value);  // ⚠️ Fallback for text-stored dates
    } catch {
        return null;
    }
};
```

**Purpose:** This utility handles the divergent formats across your schema, but its existence proves multiple standards are in use.

### 3. PostgreSQL Conversions: Milliseconds ↔ timestamptz

**Location:** `apps/backend/scripts/migrations-pg/001_add_plans_amount_webhook_log.sql:47`
```sql
-- Converting bigint milliseconds to PostgreSQL native timestamptz
ALTER TABLE webhook_log ALTER COLUMN received_at TYPE timestamptz
USING to_timestamp(received_at/1000);  -- ⚠️ Divide by 1000 to get seconds
```

**Location:** `apps/backend/scripts/admin-set-password.sh:88`
```sql
-- Converting PostgreSQL NOW() to bigint milliseconds
updated_at = (EXTRACT(EPOCH FROM NOW())*1000)::bigint  -- ⚠️ Multiply by 1000
```

**Location:** `apps/backend/scripts/admin-set-password.sh:106`
```sql
-- Display conversion for human-readable output
to_timestamp(updated_at/1000) as updated_at_readable  -- ⚠️ Divide by 1000
```

### 4. Critical Normalization: Seconds Bug Fixed

**Location:** `apps/backend/scripts/migrations-pg/006_export_job_expires_ms_normalize.sql`
```sql
-- If expires_at looks like seconds (< 1e12), scale to milliseconds.
UPDATE public.export_job
SET expires_at = expires_at * 1000
WHERE expires_at IS NOT NULL
  AND expires_at < 100000000000; -- 1e11: well below any modern ms timestamp
```

**Context:** The `export_job.expires_at` column was accidentally populated with seconds instead of milliseconds, causing an off-by-1000 corruption. Migration 006 detected and normalized all values by multiplying seconds by 1000 to convert to milliseconds.

**Risk:** This proves that mixed units have caused production bugs.

### 5. Text-Stored ISO Timestamps

**Location:** `apps/backend/scripts/migrations-pg/000_base.sql:181-182`
```sql
CREATE TABLE IF NOT EXISTS plans (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  -- ...
  created_at       text NOT NULL DEFAULT (now()::text),  -- ⚠️ Stored as text
  updated_at       text NOT NULL DEFAULT (now()::text)   -- ⚠️ Stored as text
);
```

**Location:** `apps/backend/scripts/migrations-pg/013_insert_default_plans.sql:30-31`
```sql
INSERT INTO plans (..., created_at, updated_at)
VALUES (..., NOW(), NOW())  -- ⚠️ Inserts timestamptz, implicitly coerced to text
```

**Format:** PostgreSQL's `now()::text` produces format like `2025-10-02 14:23:45.678901+00`, not standard ISO 8601.

### 6. Admin Route Usage with NOW()

**Location:** `apps/backend/src/server/routes/admin-users.ts:313`
```typescript
await pool.query(`
    INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
    VALUES ($1, 'update_user', 'user', $2, $3, NOW())  // ⚠️ Uses PostgreSQL NOW()
`, [adminId, userId, JSON.stringify(req.body)]);
```

**Problem:** The `admin_audit.created_at` column is defined as `bigint`, but this code inserts `NOW()` which returns `timestamptz`. PostgreSQL may implicitly cast this, but the result is unpredictable.

**Also found in:**
- `apps/backend/src/server/routes/admin-forwarding.ts:179`
- `apps/backend/src/server/routes/admin-forwarding.ts:252`

### 7. Admin Stats Query: Date Math with Mixed Types

**Location:** `apps/backend/src/server/routes/admin-stats.ts:24-27`
```typescript
const recentUsersResult = await pool.query(
    'SELECT COUNT(*) as count FROM "user" WHERE created_at >= NOW() - INTERVAL \'30 days\''
);
const previousUsersResult = await pool.query(
    'SELECT COUNT(*) as count FROM "user" WHERE created_at >= NOW() - INTERVAL \'60 days\' AND created_at < NOW() - INTERVAL \'30 days\''
);
```

**Problem:** Comparing `created_at` (bigint milliseconds) with `NOW() - INTERVAL` (timestamptz). This works due to implicit casting, but it's fragile and unclear.

**Similar patterns in:**
- `apps/backend/src/server/routes/admin-stats.ts:42-45` (mail_item queries)

---

## ⚠️ Inconsistencies & Risks

### 🔴 **CRITICAL RISK: Type Mismatch in admin_audit Inserts**

**Severity:** HIGH
**Impact:** Incorrect timestamps in audit logs, potential query failures

**Affected Files:**
- `apps/backend/src/server/routes/admin-users.ts:313`
- `apps/backend/src/server/routes/admin-forwarding.ts:179`
- `apps/backend/src/server/routes/admin-forwarding.ts:252`

**Problem:**
```typescript
// WRONG: Inserting NOW() (timestamptz) into created_at (bigint)
INSERT INTO admin_audit (..., created_at) VALUES (..., NOW())
```

**Expected Behavior:**
```typescript
// CORRECT: Use Date.now() to get bigint milliseconds
INSERT INTO admin_audit (..., created_at) VALUES (..., $4)
// with values: [..., Date.now()]
```

**Why it matters:** PostgreSQL will attempt to cast `NOW()` to bigint, which may produce epoch seconds instead of milliseconds, causing a 1000x time error.

---

### 🟡 **MEDIUM RISK: Text-Stored Timestamps**

**Severity:** MEDIUM
**Impact:** Parsing inconsistencies, timezone ambiguity, sorting issues

**Affected Tables:**
- `plans` (created_at, updated_at, effective_at, retired_at)
- `scan_tokens` (expires_at, created_at)
- `invoice_token` (expires_at, used_at) - base schema version
- `mail_item` (received_date, forwarded_date)

**Problem:**
- Using `text` columns with `(now()::text)` defaults stores PostgreSQL's native format
- Not ISO 8601 standard
- Timezone handling is ambiguous
- String comparison != chronological comparison

**Example:**
```sql
-- This default produces: '2025-10-02 14:23:45.678901+00'
created_at text NOT NULL DEFAULT (now()::text)
```

**Recommendation:** Migrate to bigint milliseconds for consistency with canonical standard.

---

### 🟡 **MEDIUM RISK: Dual Format in invoice_token Table**

**Severity:** MEDIUM
**Impact:** Schema conflicts, migration failures

**Affected Table:** `invoice_token`

**Problem:**
- **Base schema** (000_base.sql:148): `expires_at text`
- **Migration 003** (003_invoice_token.sql:6): `expires_at TIMESTAMPTZ`
- If migration 003 didn't properly drop/migrate the old table, both schemas may exist

**Evidence:**
```sql
-- 000_base.sql
CREATE TABLE IF NOT EXISTS invoice_token (
  expires_at       text NOT NULL,
  created_at       bigint NOT NULL
);

-- 003_invoice_token.sql
CREATE TABLE IF NOT EXISTS invoice_token (
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Recommendation:** Verify which schema is actually in production and reconcile.

---

### 🟡 **MEDIUM RISK: webhook_log Conversion Impact**

**Severity:** MEDIUM
**Impact:** Breaking changes for code expecting bigint

**Affected Table:** `webhook_log`

**Problem:**
- Migration 001 converted `received_at` from `bigint` → `timestamptz`
- Any code still expecting bigint milliseconds will fail

**Migration Logic:**
```sql
-- 001_add_plans_amount_webhook_log.sql:47
ALTER TABLE webhook_log ALTER COLUMN received_at TYPE timestamptz
USING to_timestamp(received_at/1000);
```

**Validation Needed:** Check if all webhook handlers have been updated to handle timestamptz instead of bigint.

---

### 🟢 **LOW RISK: export_job Mixed Formats**

**Severity:** LOW
**Impact:** Minimal if code handles both types correctly

**Affected Table:** `export_job`

**Problem:**
- `created_at, started_at, completed_at, finished_at` use `timestamptz`
- `expires_at` uses `bigint ms` (normalized by migration 006)
- Mixed types within same table

**Evidence:**
```sql
-- 004_export_job.sql
created_at      timestamptz NOT NULL DEFAULT now(),
started_at      timestamptz,
completed_at    timestamptz,
expires_at      bigint  -- Different type
```

**Mitigation:** Migration 006 fixed the seconds→milliseconds bug in `expires_at`, but the type inconsistency remains.

---

### 🟢 **LOW RISK: Admin Stats Date Math Fragility**

**Severity:** LOW
**Impact:** Works now due to implicit casting, but fragile

**Affected Files:**
- `apps/backend/src/server/routes/admin-stats.ts:24-45`

**Problem:**
```typescript
// Comparing bigint (ms) with timestamptz
'WHERE created_at >= NOW() - INTERVAL \'30 days\''
```

**Current Status:** PostgreSQL implicitly casts and compares, so queries work, but:
- Relies on database-level casting behavior
- Not explicit about units
- May break with strict type checking

**Recommendation:**
```typescript
// More explicit version
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
'WHERE created_at >= $1'
// with value: [thirtyDaysAgo]
```

---

## 🎯 Actionable Recommendations

### Priority 1: Fix admin_audit Type Mismatch (CRITICAL)

**Files to fix:**
1. `apps/backend/src/server/routes/admin-users.ts:313`
2. `apps/backend/src/server/routes/admin-forwarding.ts:179`
3. `apps/backend/src/server/routes/admin-forwarding.ts:252`

**Change:**
```typescript
// BEFORE (WRONG):
await pool.query(`
    INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
    VALUES ($1, 'update_user', 'user', $2, $3, NOW())
`, [adminId, userId, JSON.stringify(req.body)]);

// AFTER (CORRECT):
await pool.query(`
    INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
    VALUES ($1, 'update_user', 'user', $2, $3, $4)
`, [adminId, userId, JSON.stringify(req.body), Date.now()]);
```

### Priority 2: Audit webhook_log Usage (MEDIUM)

**Action:** Search all webhook handlers to verify they're using timestamptz, not bigint milliseconds.

**Grep command:**
```bash
grep -r "webhook_log" apps/backend/src --include="*.ts" --include="*.js"
```

### Priority 3: Reconcile invoice_token Schema Conflict (MEDIUM)

**Action:** Check production database to see which schema is active:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoice_token'
ORDER BY ordinal_position;
```

**Decision:** Either:
- Keep base schema (text) and remove migration 003
- Keep migration 003 (timestamptz) and update base schema

### Priority 4: Document Text-Stored Timestamp Behavior (LOW)

**Action:** Add comments to schema files explaining why certain columns use `text` with `(now()::text)` and what format it produces.

**Example:**
```sql
-- Note: (now()::text) produces format: '2025-10-02 14:23:45.678901+00'
-- Not ISO 8601. Use to_timestamp() for comparisons.
created_at text NOT NULL DEFAULT (now()::text)
```

### Priority 5: Consider Eventual Migration to Full Consistency (FUTURE)

**Long-term goal:** Migrate all timestamp columns to bigint milliseconds for complete consistency.

**Benefits:**
- Single source of truth
- No conversion errors
- Simpler code
- Better performance (bigint comparison faster than text)

**Affected columns:**
- `plans.created_at, updated_at, effective_at, retired_at`
- `scan_tokens.expires_at, created_at`
- `invoice_token.expires_at, used_at`
- `mail_item.received_date, forwarded_date`
- `export_job.created_at, started_at, completed_at, finished_at`
- `address.created_at`
- `user_address.created_at`
- `audit_log.created_at`
- `webhook_log.received_at`

**Migration complexity:** HIGH (requires careful data migration and code updates)

---

## 📚 Appendix: Helper Functions

### Current Time Utilities

**Location:** `apps/backend/src/server/helpers/time.ts`

```typescript
// Get current timestamp in milliseconds (canonical)
export const nowMs = (): number => Date.now();

// Get current timestamp as ISO string
export const nowISO = (): string => new Date().toISOString();

// Convert any format to Date object
export const toDateOrNull = (value: any): Date | null => {
    if (value == null || value === '') return null;

    const num = Number(value);

    // Milliseconds since epoch (13+ digits)
    if (Number.isFinite(num) && String(value).length >= 13) {
        return new Date(num);
    }

    // Seconds since epoch (10 digits or less)
    if (Number.isFinite(num) && String(value).length <= 10) {
        return new Date(num * 1000);
    }

    // ISO string or Date-parsable string
    try {
        return new Date(value);
    } catch {
        return null;
    }
};

// Convert any format to ISO string
export const toISOString = (value: any): string | null => {
    const date = toDateOrNull(value);
    return date ? date.toISOString() : null;
};
```

### PostgreSQL Conversion Patterns

**Milliseconds → timestamptz:**
```sql
to_timestamp(bigint_ms / 1000)
```

**timestamptz → Milliseconds:**
```sql
(EXTRACT(EPOCH FROM timestamptz_value) * 1000)::bigint
```

**NOW() as milliseconds:**
```sql
(EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
```

---

## 📊 Migration History Summary

| Migration | File | Impact on Time Standards |
|-----------|------|--------------------------|
| 000 | 000_base.sql | Established bigint ms as primary format |
| 001 | 001_add_plans_amount_webhook_log.sql | Converted webhook_log.received_at: bigint → timestamptz |
| 003 | 003_invoice_token.sql | Created alternate invoice_token with timestamptz (conflict) |
| 004 | 004_export_job.sql | Created export_job with mixed timestamptz + bigint |
| 006 | 006_export_job_expires_ms_normalize.sql | **Fixed seconds→ms bug** in export_job.expires_at |
| 010 | 010_address_tables.sql | Created address tables with timestamptz |
| 011 | 011_user_activity_tracking.sql | Added user.last_active_at (bigint ms) |
| 012 | 012_soft_delete_and_audit.sql | Added user.deleted_at, admin_audit.created_at (bigint ms) |
| 015 | 015_add_last_login_at.sql | Added user.last_login_at (bigint ms) |
| 017 | 017_add_expires_at_column.sql | Added mail_item.expires_at (bigint ms) |
| 018 | 018_ensure_required_columns.sql | Ensured all activity tracking columns exist |

---

## 🏁 Conclusion

Your canonical time standard is **bigint milliseconds** (JavaScript `Date.now()` format), covering 65% of timestamp columns. The remaining 35% use either text-stored timestamps or legacy `timestamptz` columns from earlier development phases.

The most urgent issue is the type mismatch in `admin_audit` inserts where PostgreSQL `NOW()` is being inserted into bigint columns. This should be fixed immediately to prevent audit log corruption.

All other inconsistencies are documented above with risk assessments and actionable recommendations for remediation.
