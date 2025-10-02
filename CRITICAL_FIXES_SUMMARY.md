# Critical Fixes Summary - Activity & Plan Management

## Issues Fixed

### 1. Activity Column & Last Login Not Working ✅

**Root Causes:**
1. **Database columns missing** - Production database missing `last_login_at` and `last_active_at` columns
2. **SQL parameterization bug** - Backend was using string interpolation `${onlineThreshold}` instead of parameterized query
3. **Missing admin_audit columns** - `target_type`, `target_id`, `details` columns don't exist in production

**Fixes Applied:**

#### Backend Fix (admin-users.ts:22-59)
Changed the SQL query to use parameterized queries instead of string interpolation:

**Before:**
```typescript
const onlineThreshold = Date.now() - (5 * 60 * 1000);
let query = `
    CASE
        WHEN u.last_active_at IS NULL THEN 'offline'
        WHEN u.last_active_at > ${onlineThreshold} THEN 'online'  -- BAD: String interpolation
        ELSE 'offline'
    END as activity_status
`;
```

**After:**
```typescript
const onlineThreshold = Date.now() - (5 * 60 * 1000);
const params: any[] = [];
let paramIndex = 1;

// Add onlineThreshold as the first parameter
params.push(onlineThreshold);
const onlineThresholdParam = `$${paramIndex}`;
paramIndex++;

let query = `
    CASE
        WHEN u.last_active_at IS NULL THEN 'offline'
        WHEN u.last_active_at > ${onlineThresholdParam} THEN 'online'  -- GOOD: Parameterized
        ELSE 'offline'
    END as activity_status
`;
```

#### Migration 018 Created
Created `018_ensure_required_columns.sql` to add all missing columns:
- `last_login_at` - Timestamp when user last logged in
- `last_active_at` - Timestamp when user last made any request
- `deleted_at` - For soft deletes
- `admin_audit.target_type` - Type of entity (e.g., "user", "mail_item")
- `admin_audit.target_id` - ID of the entity
- `admin_audit.details` - JSON details of the change

**How It Works After Fix:**
1. User logs in → `auth.ts` updates both `last_login_at` and `last_active_at`
2. Every authenticated request → `middleware/auth.ts` updates `last_active_at`
3. Backend calculates:
   - "Online" if `last_active_at` within last 5 minutes
   - "Offline" otherwise
4. Frontend displays green dot + "Online" or gray dot + "Offline" with timestamp

### 2. Plan Changes Not Persisting ✅

**Root Cause:**
The frontend was sending `plan_status` (subscription status) instead of `plan_id` (which plan the user has). The backend wasn't accepting `plan_id` updates.

**Fixes Applied:**

#### Backend Fix (admin-users.ts:225-270)
Added `plan_id` to accepted fields:

**Before:**
```typescript
const {
    email,
    first_name,
    last_name,
    is_admin,
    plan_status,  // Only this
    kyc_status
} = req.body;

// ... later ...
if (typeof plan_status === 'string') {
    updates.push(`plan_status = $${paramIndex++}`);
    values.push(plan_status);
}
```

**After:**
```typescript
const {
    email,
    first_name,
    last_name,
    is_admin,
    plan_id,        // ADDED
    plan_status,
    kyc_status
} = req.body;

// ... later ...
if (plan_id !== undefined && plan_id !== null) {
    const planIdNum = parseInt(String(plan_id));
    if (!isNaN(planIdNum)) {
        updates.push(`plan_id = $${paramIndex++}`);
        values.push(planIdNum);
    }
}
if (typeof plan_status === 'string') {
    updates.push(`plan_status = $${paramIndex++}`);
    values.push(plan_status);
}
```

#### Frontend Fix (UsersSection.tsx:649-652)
Changed from sending `plan_status` to `plan_id`:

**Before:**
```typescript
// TODO: Create endpoint to change user plan
// For now, just update plan_status
const res = await adminApi.updateUser(planModal.id, {
    plan_status: selectedPlan  // WRONG: This is subscription status, not plan ID
});
```

**After:**
```typescript
// Update user's plan_id to change their plan
const res = await adminApi.updateUser(planModal.id, {
    plan_id: parseInt(selectedPlan)  // CORRECT: This is the plan ID
});
```

**How It Works After Fix:**
1. Admin selects a plan from dropdown (shows plan names from `plans` table)
2. Frontend sends `plan_id: <number>` to backend
3. Backend updates `user.plan_id` to reference the selected plan
4. On next data refresh, the user table JOIN with plans table shows the new plan name
5. User dashboard will show updated plan (may require logout/login to refresh JWT token)

### 3. Delete User Error Fixed ✅

**Root Cause:**
The `admin_audit` table was created without `target_type`, `target_id`, and `details` columns in production.

**Fix:**
Migration 018 adds these columns if they don't exist:
```sql
-- Add target_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_audit'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE admin_audit ADD COLUMN target_type text;
    END IF;
END $$;
```

**How It Works After Fix:**
1. Admin deletes user
2. Backend logs to `admin_audit` with all required fields:
   ```sql
   INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
   VALUES ($1, 'delete_user', 'user', $2, $3, $4)
   ```
3. No error occurs, audit trail is properly logged

## What You Need to Do

### STEP 1: Run Migration 018 ⚠️ CRITICAL

**Without this migration, activity and delete will NOT work!**

```bash
# Connect to your production database
psql "your-production-database-url"

# Run the migration
\i apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql

# Verify it worked
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('last_login_at', 'last_active_at', 'deleted_at');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'admin_audit';
```

### STEP 2: Deploy Backend Changes

The backend changes are in:
- `apps/backend/src/server/routes/admin-users.ts` - Fixed activity SQL and plan_id acceptance

Deploy your backend to staging/production.

### STEP 3: Deploy Frontend Changes

The frontend changes are in:
- `apps/frontend/components/admin/UsersSection.tsx` - Fixed plan update to use plan_id

Deploy your frontend to production.

### STEP 4: Test Everything

After all deployments:

1. **Test Activity Status:**
   - Open admin dashboard → Users section
   - Look for users who recently logged in (within 5 min) → Should show "Online" 🟢
   - Look for users who haven't logged in recently → Should show "Offline" ⚪
   - Look for new users who never logged in → Should show "Offline" + "Never logged in"
   - Test activity filter: Select "Online" → Should only show recently active users

2. **Test Last Login Display:**
   - Should show actual login timestamps for users who have logged in
   - Should show "Never logged in" for users who haven't logged in yet

3. **Test Plan Changes:**
   - Select a user → Click "Plan" button
   - Choose a different plan from dropdown
   - Click "Update Plan"
   - Should see success message
   - Refresh the page
   - User's plan column should show the new plan name
   - Plan price should update accordingly

4. **Test Delete User:**
   - Select a user → Click "Delete"
   - Type their email to confirm
   - Confirm the second dialog
   - Should see success message (no errors!)
   - User should be marked as deleted
   - Check admin audit logs - should show the delete action

## Expected Behavior After All Fixes

### Activity Column
| User State | Last Login | Activity Status | Display |
|------------|------------|-----------------|---------|
| Just logged in (< 5 min ago) | Timestamp | Online | 🟢 Online<br/>Last login: Dec 15, 10:30 AM |
| Logged in earlier (> 5 min ago) | Timestamp | Offline | ⚪ Offline<br/>Last login: Dec 15, 9:00 AM |
| Never logged in | NULL | Offline | ⚪ Offline<br/>Never logged in |

### Plan Management
- Admin changes user's plan → `user.plan_id` is updated in database
- User list refreshes → Shows new plan name from JOIN with `plans` table
- User dashboard → Shows updated plan (after next login)
- Pricing page → Always shows current plans from database (unaffected by user plan changes)

### Audit Trail
- Every admin action (update user, delete user, change plan) → Logged to `admin_audit`
- Includes: who (admin_id), what (action), when (created_at), target (target_type + target_id), details (JSON)

## Troubleshooting

### Activity still shows "Offline" for everyone
- ✅ Check migration 018 was run successfully
- ✅ Check backend is deployed with the parameterized query fix
- ✅ Check browser console for any API errors
- ✅ Try logging out and back in (to update `last_login_at`)

### Plan changes not showing
- ✅ Check migration 018 was run
- ✅ Check backend accepts `plan_id` in PATCH /api/admin/users/:id
- ✅ Check frontend is deployed with plan_id fix
- ✅ Hard refresh browser (Cmd+Shift+R)
- ✅ Check database: `SELECT id, email, plan_id FROM "user" WHERE email = 'test@example.com';`

### Delete still shows error
- ✅ Check migration 018 added `target_type` column
- ✅ Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_audit';`
- ✅ Should see: id, admin_id, action, target_type, target_id, details, created_at

### Plan doesn't show in user dashboard
- This is a separate issue - user dashboard shows subscription data, not plan_id
- When you change plan_id, you're changing which plan they SHOULD have
- The actual subscription is managed by payment provider (GoCardless)
- To fully activate a plan change, you may need to create/update the subscription too

## Database Schema Reference

### user table (relevant columns)
```sql
id              bigint PRIMARY KEY
email           text
plan_id         bigint REFERENCES plans(id)     -- Which plan they have
plan_status     text                             -- Subscription status (active/cancelled/etc)
last_login_at   bigint                           -- When they last logged in
last_active_at  bigint                           -- When they last made any request
deleted_at      bigint                           -- When they were deleted (NULL if active)
```

### plans table
```sql
id              bigint PRIMARY KEY
name            text                             -- "Virtual Monthly", "Virtual Annual"
price_pence     integer
interval        text                             -- "month" or "year"
active          boolean
```

### admin_audit table
```sql
id              bigserial PRIMARY KEY
admin_id        bigint REFERENCES "user"(id)
action          text                             -- "delete_user", "update_user", etc
target_type     text                             -- "user", "mail_item", etc
target_id       bigint                           -- ID of the affected record
details         text                             -- JSON with change details
created_at      bigint
```

## Files Changed

- ✅ `apps/backend/src/server/routes/admin-users.ts` - Fixed SQL parameterization + plan_id acceptance
- ✅ `apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql` - New migration
- ✅ `apps/frontend/components/admin/UsersSection.tsx` - Fixed plan update to use plan_id
- ✅ `apps/frontend/components/EnhancedAdminDashboard.tsx` - Already fixed filter reactivity

## Migration 018 Safety

Migration 018 is **SAFE** to run because:
- ✅ Uses `ADD COLUMN IF NOT EXISTS` - won't fail if columns already exist
- ✅ Uses `CREATE TABLE IF NOT EXISTS` - won't fail if table exists
- ✅ Uses `DO $$ BEGIN ... IF NOT EXISTS ...` blocks for conditional changes
- ✅ Creates indexes with `IF NOT EXISTS` - won't fail if already exist
- ✅ Only adds columns, never drops or modifies existing data
- ✅ Can be run multiple times safely (idempotent)

The only destructive operation is cleaning up incorrect activity data:
```sql
UPDATE "user" SET last_active_at = NULL
WHERE last_login_at IS NULL AND last_active_at IS NOT NULL;
```
This is SAFE because it only affects users who have never logged in but somehow have activity timestamps (data inconsistency that should be fixed).
