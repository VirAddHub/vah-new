# 🔧 Missing Schema Fixes - Migration Guide

**Date:** 2025-10-03
**Status:** Ready to Apply
**Migrations:** 107-110

---

## 📋 Overview

These migrations fix **missing database columns and tables** that are causing production errors. These are **separate from the time standardization work** (migrations 101-106) and address pre-existing schema gaps.

---

## 🚨 Issues Being Fixed

### **Issue 1: Missing `download` Table** 🔴 HIGH PRIORITY
**Error:**
```
[GET /api/mail-items/:id/scan-url] error: relation "download" does not exist
```

**Impact:** Users cannot download or view their scanned mail documents.

**Fix:** Migration 107 creates the `download` table.

---

### **Issue 2: Missing GoCardless Columns** 🟡 MEDIUM PRIORITY
**Error:**
```
[GET /api/billing] error: column u.gocardless_customer_id does not exist
[GET /api/payments/subscriptions/status] error: column u.gocardless_customer_id does not exist
```

**Impact:** Billing and payment endpoints fail.

**Fix:** Migration 108 adds GoCardless payment columns to `user` table.

---

### **Issue 3: Missing `kyc_verified_at` Column** 🟡 MEDIUM PRIORITY
**Error:**
```
[GET /api/kyc/status] error: column "kyc_verified_at" does not exist
```

**Impact:** KYC status checks fail.

**Fix:** Migration 109 adds `kyc_verified_at` column.

---

### **Issue 4: Wrong Table Name `invoice` vs `invoices`** 🟡 MEDIUM PRIORITY
**Error:**
```
[GET /api/billing/invoices] error: relation "invoices" does not exist
```

**Impact:** Users cannot view invoices.

**Fix:** Migration 110 renames `invoice` → `invoices` and `invoice_seq` → `invoices_seq`.

---

## 📦 Migration Files

### **Migration 107: Download Table**
**File:** `107_add_download_table.sql`

**What it does:**
- Creates `download` table for tracking mail scan downloads
- Adds columns: `id`, `user_id`, `file_id`, `download_url`, `expires_at`, `created_at`, `ip_address`, `user_agent`
- Creates indexes for performance
- All timestamps use BIGINT milliseconds (consistent with time standardization)

**Schema:**
```sql
CREATE TABLE download (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    file_id BIGINT REFERENCES file(id) ON DELETE SET NULL,
    download_url TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);
```

---

### **Migration 108: GoCardless Columns**
**File:** `108_add_gocardless_columns.sql`

**What it does:**
- Adds `gocardless_customer_id` column to `user` table
- Adds `gocardless_mandate_id` column for direct debit
- Adds `gocardless_redirect_flow_id` for payment setup flow
- Creates indexes for payment lookups

**Schema:**
```sql
ALTER TABLE "user"
    ADD COLUMN gocardless_customer_id TEXT,
    ADD COLUMN gocardless_mandate_id TEXT,
    ADD COLUMN gocardless_redirect_flow_id TEXT;
```

---

### **Migration 109: KYC Verified Timestamp**
**File:** `109_add_kyc_verified_at.sql`

**What it does:**
- Adds `kyc_verified_at` column (BIGINT milliseconds)
- Creates index for KYC queries
- Backfills timestamp for already-verified users (uses `updated_at`)

**Schema:**
```sql
ALTER TABLE "user"
    ADD COLUMN kyc_verified_at BIGINT;

-- Backfill for existing verified users
UPDATE "user"
SET kyc_verified_at = updated_at
WHERE kyc_status = 'verified'
  AND kyc_verified_at IS NULL;
```

---

### **Migration 110: Rename Invoice Tables**
**File:** `110_rename_invoice_to_invoices.sql`

**What it does:**
- Renames `invoice` table to `invoices` (plural)
- Renames `invoice_seq` table to `invoices_seq`
- Updates foreign key constraints
- Recreates indexes with new table names

**Schema:**
```sql
ALTER TABLE invoice RENAME TO invoices;
ALTER TABLE invoice_seq RENAME TO invoices_seq;

-- Updates foreign keys and indexes
```

---

## 🚀 How to Apply Migrations

### **Option 1: Using psql (Recommended)**

```bash
# Connect to your production database
psql $DATABASE_URL

# Run each migration in order
\i apps/backend/scripts/migrations-pg/107_add_download_table.sql
\i apps/backend/scripts/migrations-pg/108_add_gocardless_columns.sql
\i apps/backend/scripts/migrations-pg/109_add_kyc_verified_at.sql
\i apps/backend/scripts/migrations-pg/110_rename_invoice_to_invoices.sql

# Verify migrations
SELECT table_name FROM information_schema.tables WHERE table_name IN ('download', 'invoices', 'invoices_seq');
SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name LIKE '%gocardless%';
SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'kyc_verified_at';
```

### **Option 2: Using Migration Script**

If you have a migration runner:

```bash
npm run migrate:up
# or
yarn migrate:up
```

---

## 🧪 Verification Queries

After running migrations, verify everything was created correctly:

### **1. Check Download Table Exists**
```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'download'
ORDER BY ordinal_position;
```

**Expected:** Should show 8 columns (id, user_id, file_id, download_url, expires_at, created_at, ip_address, user_agent).

---

### **2. Check GoCardless Columns Exist**
```sql
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name LIKE '%gocardless%';
```

**Expected:** Should show 3 columns (gocardless_customer_id, gocardless_mandate_id, gocardless_redirect_flow_id).

---

### **3. Check KYC Column Exists**
```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name = 'kyc_verified_at';
```

**Expected:** Should show `kyc_verified_at` as `bigint`, nullable.

---

### **4. Check Table Renames Successful**
```sql
-- Check old tables don't exist
SELECT table_name FROM information_schema.tables WHERE table_name IN ('invoice', 'invoice_seq');
-- Expected: 0 rows

-- Check new tables exist
SELECT table_name FROM information_schema.tables WHERE table_name IN ('invoices', 'invoices_seq');
-- Expected: 2 rows
```

---

### **5. Check Backfilled KYC Data**
```sql
SELECT
    id,
    email,
    kyc_status,
    kyc_verified_at,
    LENGTH(kyc_verified_at::text) as digits
FROM "user"
WHERE kyc_status = 'verified'
LIMIT 5;
```

**Expected:** Verified users should have `kyc_verified_at` populated with 13-digit millisecond timestamps.

---

## 📊 Expected Results

After applying all migrations:

### **Working Endpoints:**
- ✅ `GET /api/mail-items/:id/scan-url` - Download mail scans
- ✅ `GET /api/billing` - View billing information
- ✅ `GET /api/payments/subscriptions/status` - Check subscription status
- ✅ `GET /api/kyc/status` - Check KYC verification status
- ✅ `GET /api/billing/invoices` - View invoices

### **Database Changes:**
- ✅ 1 new table: `download`
- ✅ 3 new columns on `user`: `gocardless_customer_id`, `gocardless_mandate_id`, `gocardless_redirect_flow_id`
- ✅ 1 new column on `user`: `kyc_verified_at`
- ✅ 2 tables renamed: `invoice` → `invoices`, `invoice_seq` → `invoices_seq`
- ✅ 7 new indexes created

---

## ⚠️ Potential Issues & Solutions

### **Issue: Foreign Key Constraint Fails on Rename**
If migration 110 fails with a foreign key error:

```sql
-- Manually drop and recreate the constraint
ALTER TABLE invoice_token DROP CONSTRAINT IF EXISTS invoice_token_invoice_id_fkey;
ALTER TABLE invoice RENAME TO invoices;
ALTER TABLE invoice_token ADD CONSTRAINT invoice_token_invoices_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
```

### **Issue: Table Already Exists**
If you get "table already exists" errors, it means the migration was already partially applied:

```sql
-- Check what exists
SELECT table_name FROM information_schema.tables WHERE table_name IN ('download', 'invoices', 'invoices_seq', 'invoice', 'invoice_seq');
```

All migrations use `IF NOT EXISTS` / `IF EXISTS` so they're **idempotent** (safe to re-run).

---

## 🔄 Rollback Plan

If you need to rollback:

### **Rollback Migration 110 (Invoice Rename)**
```sql
ALTER TABLE invoices RENAME TO invoice;
ALTER TABLE invoices_seq RENAME TO invoice_seq;
-- Recreate original indexes
```

### **Rollback Migration 109 (KYC Column)**
```sql
ALTER TABLE "user" DROP COLUMN IF EXISTS kyc_verified_at;
```

### **Rollback Migration 108 (GoCardless Columns)**
```sql
ALTER TABLE "user" DROP COLUMN IF EXISTS gocardless_customer_id;
ALTER TABLE "user" DROP COLUMN IF EXISTS gocardless_mandate_id;
ALTER TABLE "user" DROP COLUMN IF EXISTS gocardless_redirect_flow_id;
```

### **Rollback Migration 107 (Download Table)**
```sql
DROP TABLE IF EXISTS download CASCADE;
```

---

## 📝 Migration Order

**IMPORTANT:** Run migrations in this exact order:

1. **107** - Download table (no dependencies)
2. **108** - GoCardless columns (no dependencies)
3. **109** - KYC column (no dependencies)
4. **110** - Invoice rename (may affect foreign keys, run last)

---

## 🎯 Post-Migration Testing

After applying migrations, test these endpoints:

```bash
# Test download endpoint (replace with valid IDs)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/mail-items/1/scan-url

# Test billing endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/billing

# Test payment status endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/payments/subscriptions/status

# Test KYC status endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/kyc/status

# Test invoices endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/billing/invoices
```

**Expected:** All should return 200 status codes (not 500 errors).

---

## 📚 Related Documentation

- `TIME_STANDARDIZATION_COMPLETE.md` - Time migrations (101-106)
- `MIGRATION_PLAN_TIME_STANDARDIZATION.md` - Time migration details
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide

---

## ✅ Completion Checklist

Before marking complete:

- [ ] All 4 migration files created (107-110)
- [ ] Migrations reviewed for correctness
- [ ] Database backed up
- [ ] Migrations applied in order
- [ ] Verification queries run successfully
- [ ] All affected endpoints return 200 (not 500)
- [ ] No errors in production logs
- [ ] Changes committed to git

---

## 🎉 Summary

These 4 migrations fix **critical production errors** that were preventing users from:
- Downloading mail scans
- Viewing billing information
- Checking payment/subscription status
- Viewing KYC verification status
- Accessing invoices

All migrations follow the **BIGINT milliseconds** standard established in migrations 101-106 for consistent timestamp handling.

**Ready to apply!** Run the migrations and test the endpoints. 🚀
