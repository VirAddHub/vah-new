# How to Run Database Migrations Securely

## ⚠️ NEVER commit database credentials to git!

This guide shows you how to run migrations safely using environment variables.

---

## Option 1: Using the Migration Runner Script (Recommended)

### Step 1: Set your database URL as an environment variable

**On macOS/Linux:**
```bash
export DATABASE_URL='postgresql://your-user:your-password@your-host/your-database'  # pragma: allowlist secret
```

**On Windows (PowerShell):**
```powershell
$env:DATABASE_URL='postgresql://your-user:your-password@your-host/your-database'  # pragma: allowlist secret
```

**On Windows (CMD):**
```cmd
set DATABASE_URL=postgresql://your-user:your-password@your-host/your-database  # pragma: allowlist secret
```

### Step 2: Run the migration

```bash
cd apps/backend/scripts
./run-migration.sh migrations-pg/018_ensure_required_columns.sql
```

The script will:
- ✅ Check if the migration file exists
- ✅ Check if DATABASE_URL is set
- ✅ Show you what database you're connecting to (with password hidden)
- ✅ Ask for confirmation before running
- ✅ Run the migration and show results

### Step 3: Verify the migration

```bash
./verify-database.sh
```

This will check:
- ✅ All required columns exist
- ✅ All required tables exist
- ✅ Database statistics (user counts, plan counts)
- ✅ Data consistency checks

---

## Option 2: Using psql Directly

### Step 1: Set DATABASE_URL

Same as Option 1 above.

### Step 2: Run migration

```bash
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql
```

### Step 3: Verify

```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name IN ('last_login_at', 'last_active_at', 'deleted_at');"
```

---

## Option 3: Using Render Dashboard (Web UI)

### Step 1: Access your database

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Click "Connect" → "External Connection"
4. Click "PSQL Command" to copy the connection command

### Step 2: Connect to database

```bash
# Paste the command from Render dashboard
psql postgresql://vah_postgres_40zq_user:***@dpg-....oregon-postgres.render.com/vah_postgres_40zq  # pragma: allowlist secret
```

### Step 3: Run migration from psql prompt

```sql
\i apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql
```

### Step 4: Check results

```sql
\dt  -- List tables
\d user  -- Show user table structure
\d admin_audit  -- Show admin_audit table structure
```

---

## What Migration 018 Does

This migration is **safe** and **idempotent** (can be run multiple times):

### Adds to `user` table:
- `last_login_at` bigint - Timestamp when user last logged in
- `last_active_at` bigint - Timestamp when user last made any request
- `deleted_at` bigint - Timestamp when user was deleted (NULL if active)

### Adds to `admin_audit` table:
- `target_type` text - Type of entity (e.g., "user", "mail_item")
- `target_id` bigint - ID of the entity
- `details` text - JSON details of the change

### Also creates:
- Performance indexes for fast queries
- Cleans up any data inconsistencies

---

## After Running Migration

### 1. Verify it worked

Run the verification script:
```bash
DATABASE_URL='your-url' ./verify-database.sh
```

You should see:
- ✅ PASS - All required columns exist
- ✅ PASS - All required columns exist (admin_audit)
- ✅ Total users: X
- ✅ Active plans: Y

### 2. Deploy code changes

The migration alone isn't enough - you also need to deploy the updated code:

**Backend changes:**
- Fixed SQL parameterization in `admin-users.ts`
- Added `plan_id` support in user updates

**Frontend changes:**
- Fixed plan updates to use `plan_id` instead of `plan_status`
- Fixed filter reactivity in `EnhancedAdminDashboard.tsx`
- Removed double filtering in `UsersSection.tsx`

### 3. Test everything

After deployment, test:
- ✅ Activity column shows correct online/offline status
- ✅ Last login timestamps display properly
- ✅ Plan changes persist correctly
- ✅ Delete user works without errors
- ✅ All filters work (search, status, plan, KYC, activity)

---

## Security Best Practices

### ✅ DO:
- Use environment variables for database URLs
- Rotate database passwords if they were exposed
- Use `.env` files for local development (and add to `.gitignore`)
- Use Render's secret environment variables for production
- Review code before committing to ensure no secrets

### ❌ DON'T:
- Hardcode database URLs in scripts
- Commit `.env` files to git
- Share database credentials in chat/email
- Run migrations without backups (for production)
- Skip verification after running migrations

---

## Getting Your Database URL

### From Render Dashboard:

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Click "Connect"
4. Copy the "External Database URL"

It will look like:
```
postgresql://username:password@hostname.render.com/database_name  # pragma: allowlist secret
```

### Store it securely:

**For local use:**
```bash
# Add to your ~/.bashrc or ~/.zshrc
export DATABASE_URL='postgresql://...'  # pragma: allowlist secret
```

**For production (Render):**
1. Go to your web service settings
2. Environment → Add environment variable
3. Key: `DATABASE_URL`
4. Value: Your database URL
5. Save

---

## Troubleshooting

### "psql: command not found"

Install PostgreSQL client:

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### "could not translate host name"

Make sure you're using the full external hostname:
```
postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/database  # pragma: allowlist secret
```

NOT:
```
postgresql://user:pass@dpg-xxxxx-a/database  # pragma: allowlist secret
```

### "FATAL: password authentication failed"

Your password may have special characters that need escaping in the URL. Or the password has been rotated. Get a fresh URL from Render dashboard.

### Migration fails with "column already exists"

This is OK! The migration uses `IF NOT EXISTS` checks. The migration is idempotent and safe to run multiple times.

---

## Need Help?

If you encounter issues:

1. **Check the verification script output** - it will tell you what's missing
2. **Check Render logs** - may have more details about connection issues
3. **Try connecting manually** - `psql $DATABASE_URL` to test connection
4. **Review migration file** - make sure it's the correct one

Remember: Migration 018 is **safe** and **idempotent** - it won't break anything even if run multiple times!
