# Migration 018 - Fix Missing Columns

## Issues This Migration Fixes

1. **Activity Status Not Working** - Missing `last_login_at` and `last_active_at` columns
2. **Delete User Error** - Missing `target_type`, `target_id`, and `details` columns in `admin_audit` table
3. **Incorrect Activity Data** - Users showing "Online" when they've never logged in

## What This Migration Does

The migration file `018_ensure_required_columns.sql` will:

1. ✅ Add `last_login_at` column to user table (if missing)
2. ✅ Add `last_active_at` column to user table (if missing)
3. ✅ Add `deleted_at` column to user table (if missing)
4. ✅ Create `admin_audit` table with all required columns (if missing)
5. ✅ Add missing columns to existing `admin_audit` table:
   - `target_type` - What type of entity was modified (e.g., "user", "mail_item")
   - `target_id` - ID of the entity that was modified
   - `details` - JSON details about the change
6. ✅ Create all necessary indexes for performance
7. ✅ Clean up incorrect activity data (users who never logged in won't show as "Online")

## How to Run the Migration

### Option 1: Using Render Dashboard (Recommended)

1. Go to your Render dashboard
2. Select your PostgreSQL database
3. Click "Connect" → "External Connection"
4. Copy the connection string
5. Open a terminal and connect:
   ```bash
   psql "postgresql://your-connection-string-here"
   ```
6. Run the migration:
   ```sql
   \i apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql
   ```
7. Verify the columns exist:
   ```sql
   -- Check user table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'user'
   AND column_name IN ('last_login_at', 'last_active_at', 'deleted_at');

   -- Check admin_audit table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'admin_audit';
   ```

### Option 2: Using Migration Script

If you have a migration runner script:

```bash
cd apps/backend
npm run migrate:prod
```

## After Running Migration

1. **Refresh your admin dashboard** - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. **Test activity status:**
   - Users who have logged in recently (last 5 minutes) should show "Online"
   - Users who logged in more than 5 minutes ago should show "Offline"
   - Users who never logged in should show "Offline" + "Never logged in"
3. **Test delete functionality:**
   - Try deleting a user - should work without errors
   - Check the audit log to see the delete action was recorded
4. **Test filters:**
   - Filter by "Online" - should show only recently active users
   - Filter by "Offline" - should show inactive users
   - Clear filters - should show all users

## Rollback (if needed)

If something goes wrong, you can rollback by:

```sql
-- Drop the columns added (NOT RECOMMENDED - will lose data)
ALTER TABLE "user" DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE "user" DROP COLUMN IF EXISTS last_active_at;
ALTER TABLE "user" DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE admin_audit DROP COLUMN IF EXISTS target_type;
ALTER TABLE admin_audit DROP COLUMN IF EXISTS target_id;
ALTER TABLE admin_audit DROP COLUMN IF EXISTS details;
```

**Note:** Only rollback if absolutely necessary, as you'll lose activity tracking data.

## Expected Results

### Before Migration:
- ❌ Activity column shows incorrect data
- ❌ "Last login" shows "Never logged in" for all users
- ❌ Delete user fails with "column target_type does not exist"
- ❌ Users created via signup show as "Online"

### After Migration:
- ✅ Activity column shows correct online/offline status
- ✅ "Last login" shows actual login timestamps
- ✅ Delete user works correctly and logs to admin_audit
- ✅ Only actually active users show as "Online"

## Support

If you encounter any issues:
1. Check the PostgreSQL logs in Render dashboard
2. Verify your database connection string is correct
3. Ensure you have admin privileges on the database
4. Share any error messages for troubleshooting
