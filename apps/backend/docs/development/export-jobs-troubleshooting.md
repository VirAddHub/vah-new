# Export Jobs Troubleshooting Guide

## Emergency Safety Valve

If export jobs are causing database errors or crashes:

```bash
# Immediately pause all hourly export jobs
HOURLY_EXPORTS_ENABLED=false
```

This will stop the hourly cleanup scheduler from running, preventing further database errors.

## Common Issues

### 42703: Column "storage_expires_at" does not exist

This error indicates that the database schema is missing the `storage_expires_at` column. This should not happen with the current setup, but if it does:

1. **Check if migration 008 was applied:**
   ```bash
   psql "$DATABASE_URL" -c "\d+ public.export_job" | grep storage_expires_at
   ```

2. **If column exists, run migration 008:**
   ```bash
   psql "$DATABASE_URL" -f scripts/migrations-pg/008_drop_storage_expires_at.sql
   ```

3. **If column doesn't exist, check for stale build:**
   - Look for `[prestart] ✅ dist build verified clean` in logs
   - If missing, redeploy with clean build

### 42P01: Relation "export_job" does not exist

This indicates the `export_job` table is missing entirely:

1. **Run all migrations:**
   ```bash
   npm run migrate
   ```

2. **Check table exists:**
   ```bash
   psql "$DATABASE_URL" -c "\dt public.export_job"
   ```

## Monitoring

The system now includes automatic monitoring for critical database errors:

- `[pg.query] error: 42703` - Column missing errors
- `[pg.query] error: 42P01` - Table missing errors

These will be logged with `🚨 CRITICAL DB ERROR DETECTED:` prefix for easy identification.

## Verification Commands

### Check Schema
```bash
psql "$DATABASE_URL" -c "
SELECT column_name, is_generated
FROM information_schema.columns
WHERE table_name='export_job'
  AND column_name IN ('expires_at','storage_expires_at')
ORDER BY column_name;"
```

### Check for Stale Data
```bash
psql "$DATABASE_URL" -c "
SELECT COUNT(*) AS still_seconds
FROM public.export_job
WHERE expires_at IS NOT NULL AND expires_at < 100000000000;"
```

### Verify Clean Build
```bash
grep -r "COALESCE(storage_expires_at" dist/ || echo "✅ clean"
```

## Expected Boot Sequence

Normal startup should show:
```
[prestart] running schema repair
[repair] storage_expires_at column confirmed absent ✅
[prestart] ✅ dist build verified clean
[boot] build: { commit, builtAt }
[schema] export_job.storage_expires_at present: false
[export-jobs] Hourly cleanup scheduled (locked)
```

## Recovery Steps

1. **Pause jobs:** `HOURLY_EXPORTS_ENABLED=false`
2. **Check logs:** Look for the exact error message
3. **Apply fixes:** Run appropriate migrations or redeploy
4. **Verify:** Check boot sequence and run verification commands
5. **Re-enable:** `HOURLY_EXPORTS_ENABLED=true`

## Prevention

The system now includes multiple layers of protection:

- **Schema self-healing:** Automatically creates missing columns
- **Stale build detection:** Prevents startup with old compiled code
- **Dynamic expiry detection:** All queries use `expiryExpr()` helper
- **Global SQL logging:** Catches any remaining hardcoded references
- **Monitoring alerts:** Immediate notification of critical errors
