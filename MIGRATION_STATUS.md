# Migration Status Report

Generated: $(date)

## Overview

This document lists all SQL migration files found in the codebase and helps identify which ones may not have been applied to the database.

## Migration Directories

The migration system (`migrate-pg.cjs`) automatically picks up files matching the pattern `^\d+_.*\.sql$` from:
- `apps/backend/scripts/migrations-pg/` (legacy directory)
- `migrations/` (root level directory)

**Note:** Files in `apps/backend/migrations/` are NOT automatically picked up by the migration script unless they're also in one of the above directories.

## Standard Migrations (64 files)

These files match the migration pattern and should be automatically applied:

### From `apps/backend/scripts/migrations-pg/`:
1. `000_base.sql`
2. `001_add_plans_amount_webhook_log.sql`
3. `002_add_invoice_number_column.sql`
4. `003_invoice_token.sql` ⚠️ (also exists in `apps/backend/migrations/`)
5. `004_export_job.sql`
6. `006_export_job_expires_ms_normalize.sql`
7. `007_export_job_storage_expires_alias.sql`
8. `008_drop_storage_expires_at.sql`
9. `009_storage_expires_hotfix.sql`
10. `010_address_tables.sql`
11. `011_user_activity_tracking.sql`
12. `012_soft_delete_and_audit.sql`
13. `013_insert_default_plans.sql`
14. `014_add_user_plan_id.sql`
15. `015_add_last_login_at.sql`
16. `016_add_file_table.sql`
17. `017_add_expires_at_column.sql`
18. `017_fix_activity_status.sql`
19. `018_ensure_required_columns.sql`
20. `019_add_forwarding_status.sql`
21. `020_add_is_read_column.sql`
22. `101_time_ms_plans.sql`
23. `102_time_ms_scan_tokens.sql`
24. `103_time_ms_invoice_token.sql`
25. `103_time_ms_invoice_token_fixed.sql`
26. `104_time_ms_mail_item_dates.sql`
27. `105_time_ms_webhook_export_address.sql`
28. `105_time_ms_webhook_export_address_fixed.sql`
29. `106_time_ms_not_null_defaults.sql`
30. `107_add_download_table.sql`
31. `108_add_gocardless_columns.sql`
32. `109_add_kyc_verified_at.sql`
33. `110_rename_invoice_to_invoices.sql`
34. `111_add_missing_columns.sql`
35. `112_fix_api_endpoint_columns.sql`
36. `113_create_maintenance_tables.sql`
37. `114_create_blog_posts_table.sql`
38. `115_add_author_to_blog_posts.sql`

### From `migrations/` (root):
39. `021_create_blog_system.sql`
40. `022_concurrency_controls.sql`
41. `023_create_admin_activity_tables.sql`
42. `024_add_companies_house_verification.sql`
43. `025_add_kyc_approved_timestamps.sql`
44. `025_ch_verification_review.sql`
45. `026_backfill_ch_verification_columns.sql`
46. `20251004_fix_schemas.sql`
47. `20251007_fix_missing_schema.sql`

### From `apps/backend/migrations/`:
⚠️ **WARNING:** These files are in `apps/backend/migrations/` which is NOT automatically scanned by `migrate-pg.cjs`. They may need to be manually applied or moved to the correct directory.

48. `003_invoice_token.sql` (duplicate of migrations-pg version)
49. `004_webhook_log.pg.sql`
50. `004_webhook_log.sqlite.sql`
51. `006_add_soft_delete.sql`
52. `020_fix_missing_columns.sql`
53. `021_add_forwarding_address.sql`
54. `022_remove_digital_mailbox_plan.sql`
55. `023_add_payment_retry_system.sql`
56. `025_forwarding_charges.sql`
57. `026_enhanced_forwarding_system.sql`
58. `027_admin_forwarding_system.sql`
59. `028_forwarding_perf.sql`
60. `028_normalize_forwarding_status.sql`
61. `029_forwarding_trigger.sql`
62. `030_quiz_leads.sql`
63. `031_admin_overview_indexes.sql`
64. `032_add_mailroom_expiry_notified.sql`
65. `20251001_add_password_reset_columns.sql`

## Other SQL Files (4 files)

These files don't match the standard migration pattern and may need manual application:

1. `apps/backend/migrations/add_audit_log.sql`
2. `apps/backend/migrations/add_password_reset.sql`
3. `apps/backend/migrations/add_session_index.sql`
4. `migrations/manual_ch_migration_backfill.sql`

## How to Check Applied Migrations

### Option 1: Use the check script (requires DATABASE_URL)

```bash
cd apps/backend
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
node scripts/check-unmigrated.cjs
```

### Option 2: Query database directly

```sql
SELECT name, applied_at 
FROM migrations 
ORDER BY applied_at;
```

### Option 3: List all migration files

```bash
cd apps/backend
node scripts/list-all-migrations.cjs
```

## Important Notes

1. **Directory Mismatch**: Files in `apps/backend/migrations/` are NOT automatically picked up by the migration script. Consider:
   - Moving them to `migrations/` (root) or `apps/backend/scripts/migrations-pg/`
   - Or manually applying them
   - Or updating `migrate-pg.cjs` to include this directory

2. **Duplicate Files**: `003_invoice_token.sql` exists in both:
   - `apps/backend/scripts/migrations-pg/003_invoice_token.sql`
   - `apps/backend/migrations/003_invoice_token.sql`
   
   Only the migrations-pg version will be automatically applied.

3. **Blog Migrations**: Recent blog-related migrations:
   - `114_create_blog_posts_table.sql`
   - `115_add_author_to_blog_posts.sql`
   
   These should be in the migrations-pg directory and will be automatically applied.

## Next Steps

1. Run `node scripts/check-unmigrated.cjs` with your DATABASE_URL to see which migrations haven't been applied
2. Review files in `apps/backend/migrations/` - they may need to be moved or manually applied
3. Check for any duplicate migrations and consolidate if needed
4. Ensure all critical migrations have been applied to production
