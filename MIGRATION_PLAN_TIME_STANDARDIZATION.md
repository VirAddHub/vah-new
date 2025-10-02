# Time Standardization Migration Plan

**Goal:** Standardize all timestamps to BIGINT epoch milliseconds with generated timestamptz mirrors for SQL convenience.

**Status:** Ready to implement
**Estimated Time:** 2-3 hours (migrations + code changes + testing)

---

## 📋 Migration Checklist

### Phase 1: Database Migrations (30 min)
- [ ] Create migration files 101-106
- [ ] Review migration SQL for production readiness
- [ ] Backup production database
- [ ] Run migrations in sequence
- [ ] Verify generated columns populated correctly

### Phase 2: Backend Code Changes (60 min)
- [ ] Create time helper utility
- [ ] Fix admin-users.ts (admin_audit inserts)
- [ ] Fix admin-forwarding.ts (NOW() usage)
- [ ] Fix admin-stats.ts (date math)
- [ ] Update webhook handlers
- [ ] Update plans CRUD operations
- [ ] Update any seeds/fixtures

### Phase 3: Validation (30 min)
- [ ] Run grep checklist for stragglers
- [ ] Execute test plan queries
- [ ] Verify admin actions log correctly
- [ ] Test webhook ingestion
- [ ] Check stats endpoints return correct data

### Phase 4: Cleanup (Optional - Later)
- [ ] Deprecate legacy columns (add comments)
- [ ] Plan eventual column drops
- [ ] Update API documentation

---

## 🗃️ Migration Files to Create

All files go in: `apps/backend/scripts/migrations-pg/`

### File List
1. `101_time_ms_plans.sql` - Plans table standardization
2. `102_time_ms_scan_tokens.sql` - Scan tokens standardization
3. `103_time_ms_invoice_token.sql` - Invoice token harmonization
4. `104_time_ms_mail_item_dates.sql` - Mail item date fields
5. `105_time_ms_webhook_export_address.sql` - Webhook, export_job, address tables
6. `106_time_ms_not_null_defaults.sql` - Add constraints and defaults

---

## 🧩 Code Files to Modify

### New Files to Create
1. `apps/backend/src/lib/time.ts` - Time utilities

### Files to Modify
1. `apps/backend/src/server/routes/admin-users.ts`
2. `apps/backend/src/server/routes/admin-forwarding.ts`
3. `apps/backend/src/server/routes/admin-stats.ts`
4. `apps/backend/routes/webhooks-onedrive.js` (or .ts if migrated)

---

## ⚠️ Pre-Migration Validation Queries

Run these before migrating to understand current state:

```sql
-- Check if columns already exist (idempotency)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('plans', 'scan_tokens', 'invoice_token', 'mail_item', 'webhook_log', 'export_job', 'address', 'user_address')
  AND column_name LIKE '%_ms'
ORDER BY table_name, column_name;

-- Sample current data types
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'plans' AND column_name IN ('created_at', 'updated_at', 'effective_at', 'retired_at')
ORDER BY ordinal_position;

-- Check for NULL values that might cause issues
SELECT COUNT(*) as null_created,
       (SELECT COUNT(*) FROM plans WHERE updated_at IS NULL) as null_updated
FROM plans WHERE created_at IS NULL;
```

---

## 🔥 Critical Issues Fixed by This Patch

### Issue 1: admin_audit Type Mismatch (CRITICAL)
**Current:** `INSERT INTO admin_audit (..., created_at) VALUES (..., NOW())`
**Problem:** Inserting timestamptz into bigint column
**Fix:** Use `Date.now()` parameterized value

**Files affected:**
- `apps/backend/src/server/routes/admin-users.ts:313`
- `apps/backend/src/server/routes/admin-forwarding.ts:179, 252`

### Issue 2: admin_stats Date Math (MEDIUM)
**Current:** `WHERE created_at >= NOW() - INTERVAL '30 days'`
**Problem:** Comparing bigint ms with timestamptz (implicit cast)
**Fix:** Use explicit millisecond calculations

**Files affected:**
- `apps/backend/src/server/routes/admin-stats.ts:24-45`

### Issue 3: Text-Stored Timestamps (MEDIUM)
**Current:** `created_at text NOT NULL DEFAULT (now()::text)`
**Problem:** PostgreSQL native format, not ISO 8601, no type safety
**Fix:** Add parallel `*_ms` columns, generate `*_ts` for SQL convenience

**Tables affected:**
- plans
- scan_tokens
- invoice_token (base schema)
- mail_item (received_date, forwarded_date)

---

## 📊 Expected Schema After Migration

### Example: plans table
```sql
-- Legacy columns (keep for now, deprecate later)
created_at       text
updated_at       text
effective_at     text
retired_at       text

-- New canonical columns
created_at_ms    bigint NOT NULL DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::bigint)
updated_at_ms    bigint NOT NULL DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::bigint)
effective_at_ms  bigint NOT NULL DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::bigint)
retired_at_ms    bigint

-- Generated mirrors for SQL convenience (don't write to these)
created_at_ts    timestamptz GENERATED ALWAYS AS (to_timestamp(created_at_ms / 1000.0)) STORED
updated_at_ts    timestamptz GENERATED ALWAYS AS (to_timestamp(updated_at_ms / 1000.0)) STORED
effective_at_ts  timestamptz GENERATED ALWAYS AS (to_timestamp(effective_at_ms / 1000.0)) STORED
retired_at_ts    timestamptz GENERATED ALWAYS AS (to_timestamp(retired_at_ms / 1000.0)) STORED
```

### Benefits of This Approach
1. **Canonical format:** All writes use BIGINT milliseconds
2. **SQL convenience:** Can query using `*_ts` columns with SQL date functions
3. **Backward compatible:** Legacy columns remain until code fully migrated
4. **Type safe:** BIGINT prevents implicit timestamptz conversions
5. **No sync drift:** Generated columns always match `*_ms` source

---

## 🧪 Post-Migration Validation Queries

```sql
-- Verify new columns exist and are populated
SELECT
  id,
  created_at,           -- legacy text
  created_at_ms,        -- new canonical
  created_at_ts,        -- generated mirror
  LENGTH(created_at_ms::text) as ms_digits  -- should be 13
FROM plans
ORDER BY id DESC
LIMIT 5;

-- Check generated columns compute correctly
SELECT
  id,
  created_at_ms,
  created_at_ts,
  to_timestamp(created_at_ms / 1000.0) as manual_calc,
  created_at_ts = to_timestamp(created_at_ms / 1000.0) as match
FROM plans
LIMIT 5;

-- Verify admin_audit now has proper millisecond timestamps
SELECT
  id,
  created_at,
  LENGTH(created_at::text) as digits,
  to_timestamp(created_at / 1000.0) as readable
FROM admin_audit
ORDER BY id DESC
LIMIT 5;

-- Check webhook_log has ms mirror
SELECT
  id,
  received_at,          -- original timestamptz
  received_at_ms,       -- new ms mirror
  received_at_ts,       -- generated mirror
  EXTRACT(EPOCH FROM received_at) * 1000 as manual_calc,
  ABS(received_at_ms - EXTRACT(EPOCH FROM received_at) * 1000) < 1 as match
FROM webhook_log
ORDER BY id DESC
LIMIT 5;
```

---

## 🔎 Grep Checklist Commands

Run these in your terminal to find remaining issues:

```bash
# Find risky NOW() inserts into BIGINT columns
echo "=== Checking for NOW() in BIGINT inserts ==="
rg -n "INSERT INTO.*created_at.*NOW\(\)" apps/backend/src --type ts
rg -n "INSERT INTO.*updated_at.*NOW\(\)" apps/backend/src --type ts

# Find date comparisons mixing types
echo "=== Checking for mixed type date comparisons ==="
rg -n "WHERE.*_at.*NOW\(\)" apps/backend/src --type ts
rg -n "INTERVAL" apps/backend/src --type ts

# Find direct references to legacy columns (should use *_ms instead)
echo "=== Checking for legacy column usage in plans ==="
rg -n "plans\.created_at[^_]" apps/backend/src --type ts
rg -n "plans\.updated_at[^_]" apps/backend/src --type ts

# Find seconds-based timestamps (should use milliseconds)
echo "=== Checking for seconds instead of milliseconds ==="
rg -n "Date\.now\(\).*1000" apps/backend/src --type ts
rg -n "getTime\(\).*1000" apps/backend/src --type ts

# Find EXTRACT(EPOCH) without millisecond conversion
echo "=== Checking for EPOCH extraction without *1000 ==="
rg -n "EXTRACT\(EPOCH FROM.*\)(?!\s*\*\s*1000)" apps/backend --type sql
```

---

## 🎯 Implementation Order

### Step 1: Prepare (5 min)
```bash
# Backup database
pg_dump $DATABASE_URL > backup_before_time_migration_$(date +%Y%m%d_%H%M%S).sql

# Create migration directory if needed
mkdir -p apps/backend/scripts/migrations-pg
```

### Step 2: Create Migration Files (10 min)
Create files 101-106 with provided SQL content.

### Step 3: Review Migrations (5 min)
- Check for syntax errors
- Verify idempotency (IF NOT EXISTS, COALESCE)
- Confirm backfill logic matches your data

### Step 4: Run Migrations (10 min)
```bash
# Connect to database
psql $DATABASE_URL

# Run each migration in order
\i apps/backend/scripts/migrations-pg/101_time_ms_plans.sql
\i apps/backend/scripts/migrations-pg/102_time_ms_scan_tokens.sql
\i apps/backend/scripts/migrations-pg/103_time_ms_invoice_token.sql
\i apps/backend/scripts/migrations-pg/104_time_ms_mail_item_dates.sql
\i apps/backend/scripts/migrations-pg/105_time_ms_webhook_export_address.sql
\i apps/backend/scripts/migrations-pg/106_time_ms_not_null_defaults.sql

# Verify
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%_ms'
ORDER BY table_name;
```

### Step 5: Create Time Helper (5 min)
Create `apps/backend/src/lib/time.ts` with provided utilities.

### Step 6: Fix Critical Issues (20 min)
Update admin-users.ts, admin-forwarding.ts, admin-stats.ts with provided diffs.

### Step 7: Update Application Code (20 min)
- Update webhook handlers
- Update plans CRUD
- Update any seeds/fixtures

### Step 8: Test (20 min)
- Run validation queries
- Test admin actions
- Test stats endpoints
- Test webhook ingestion

### Step 9: Deploy (10 min)
```bash
# Commit changes
git add .
git commit -m "Standardize timestamps to BIGINT milliseconds with generated timestamptz mirrors"

# Push to deploy
git push origin main
```

### Step 10: Monitor (Ongoing)
- Check error logs for type mismatches
- Verify new data uses *_ms columns
- Run grep checklist periodically

---

## 🚨 Rollback Plan

If something goes wrong:

```sql
-- Rollback migrations (drop new columns)
ALTER TABLE plans DROP COLUMN IF EXISTS created_at_ms CASCADE;
ALTER TABLE plans DROP COLUMN IF EXISTS updated_at_ms CASCADE;
ALTER TABLE plans DROP COLUMN IF EXISTS effective_at_ms CASCADE;
ALTER TABLE plans DROP COLUMN IF EXISTS retired_at_ms CASCADE;

-- Repeat for other tables: scan_tokens, invoice_token, mail_item, etc.

-- Or restore from backup
psql $DATABASE_URL < backup_before_time_migration_YYYYMMDD_HHMMSS.sql
```

Then revert code changes via Git:
```bash
git revert HEAD
git push origin main
```

---

## 📚 Future Cleanup (Phase 2 - Later)

Once all code migrated to `*_ms` columns:

### Step 1: Deprecate Legacy Columns
```sql
-- Add comments marking them as deprecated
COMMENT ON COLUMN plans.created_at IS 'DEPRECATED: Use created_at_ms instead';
COMMENT ON COLUMN plans.updated_at IS 'DEPRECATED: Use updated_at_ms instead';
```

### Step 2: Drop Legacy Columns (After 1-2 release cycles)
```sql
ALTER TABLE plans DROP COLUMN created_at;
ALTER TABLE plans DROP COLUMN updated_at;
ALTER TABLE plans DROP COLUMN effective_at;
ALTER TABLE plans DROP COLUMN retired_at;

ALTER TABLE scan_tokens DROP COLUMN created_at;
ALTER TABLE scan_tokens DROP COLUMN expires_at;

ALTER TABLE invoice_token DROP COLUMN created_at;
ALTER TABLE invoice_token DROP COLUMN expires_at;
ALTER TABLE invoice_token DROP COLUMN used_at;

ALTER TABLE mail_item DROP COLUMN received_date;
ALTER TABLE mail_item DROP COLUMN forwarded_date;
```

### Step 3: Rename *_ms Columns to Drop Suffix (Optional)
```sql
ALTER TABLE plans RENAME COLUMN created_at_ms TO created_at;
ALTER TABLE plans RENAME COLUMN updated_at_ms TO updated_at;
-- etc.
```

---

## 📖 Developer Guidelines (Add to Team Docs)

### When Writing New Code

**✅ DO:**
```typescript
// Use Date.now() for BIGINT milliseconds
const now = Date.now();
await pool.query(
  'INSERT INTO plans (name, created_at_ms, updated_at_ms) VALUES ($1, $2, $2)',
  [name, now]
);

// Read milliseconds, optionally convert for display
const result = await pool.query('SELECT id, created_at_ms FROM plans WHERE id = $1', [id]);
const createdAtMs = result.rows[0].created_at_ms;
const createdAtIso = new Date(createdAtMs).toISOString();
```

**❌ DON'T:**
```typescript
// Don't use NOW() for BIGINT columns
await pool.query('INSERT INTO plans (..., created_at_ms) VALUES (..., NOW())');

// Don't compare BIGINT with timestamptz
await pool.query('SELECT * FROM plans WHERE created_at_ms >= NOW()');

// Don't use seconds (causes off-by-1000 errors)
const now = Math.floor(Date.now() / 1000);
```

### SQL Query Patterns

**For JavaScript/TypeScript:**
```typescript
// Calculate time ranges in milliseconds
const MS_DAY = 24 * 60 * 60 * 1000;
const thirtyDaysAgo = Date.now() - (30 * MS_DAY);

// Use parameterized queries
const result = await pool.query(
  'SELECT * FROM plans WHERE created_at_ms >= $1',
  [thirtyDaysAgo]
);
```

**For raw SQL (psql, migrations):**
```sql
-- Use generated *_ts columns for date math
SELECT * FROM plans
WHERE created_at_ts >= NOW() - INTERVAL '30 days';

-- Or calculate milliseconds explicitly
SELECT * FROM plans
WHERE created_at_ms >= (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000)::BIGINT;
```

---

## 🎓 Key Concepts

### Why BIGINT Milliseconds?
1. **JavaScript native:** `Date.now()` returns milliseconds
2. **No timezone issues:** Unix epoch is UTC
3. **Type safe:** Can't accidentally mix with timestamptz
4. **Sortable:** Direct integer comparison
5. **No precision loss:** Millisecond accuracy

### Why Generated timestamptz Mirrors?
1. **SQL convenience:** Use `WHERE date_ts >= NOW() - INTERVAL '1 day'`
2. **Human readable:** `SELECT id, created_at_ts FROM plans`
3. **No sync issues:** Always matches `*_ms` source
4. **Zero maintenance:** PostgreSQL updates automatically

### Migration Strategy
1. **Add new columns** (keep old ones)
2. **Backfill data** from old to new
3. **Update code** to write to new columns
4. **Verify** old and new match
5. **Deprecate** old columns
6. **Drop** old columns (later)

---

## ✅ Success Criteria

Migration is complete when:

- [ ] All 6 migrations executed without errors
- [ ] Validation queries show 13-digit millisecond timestamps
- [ ] Generated columns compute correctly
- [ ] Admin actions log with millisecond precision
- [ ] Stats endpoints return correct data
- [ ] Webhook handlers store millisecond timestamps
- [ ] No grep checklist warnings remain
- [ ] Application functions normally
- [ ] No database errors in logs

---

## 📞 Support

If you encounter issues:

1. **Check logs:** Look for SQL errors or type mismatch warnings
2. **Verify migrations:** Run validation queries to confirm schema
3. **Review diffs:** Ensure all code changes applied correctly
4. **Test locally:** Try migrations on local database first
5. **Rollback if needed:** Use backup and git revert

---

## 📝 Notes

- Migrations are idempotent (safe to re-run)
- Legacy columns preserved for backward compatibility
- Generated columns have zero storage overhead (computed on read)
- All timestamps in UTC (no timezone conversion needed)
- Millisecond precision sufficient for business logic

---

**Ready to implement?** Start with Phase 1 (migrations), then move to Phase 2 (code changes).
