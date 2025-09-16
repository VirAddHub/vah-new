# Postgres Migration Guide

## ✅ What's Been Implemented

Your app is now ready to migrate from SQLite to Postgres on Render! Here's what was added:

### 1. Postgres Migration System
- **`scripts/migrate-pg.cjs`** - Postgres migrator that runs SQL migrations from `scripts/migrations-pg/`
- **`scripts/migrations-pg/000_base.sql`** - Consolidated schema compatible with your existing SQLite structure
- **`scripts/seed-pg.cjs`** - Optional seed script for basic data (plans, admin user)

### 2. Updated Prestart Logic
- **`scripts/prestart.cjs`** - Now detects Postgres vs SQLite and runs appropriate migrator
- Automatically runs PG migrations when `DATABASE_URL` starts with `postgres`
- Falls back to SQLite for local development

### 3. Schema Compatibility
The Postgres schema maintains compatibility with your existing server code:
- Uses `"user"` table (quoted) to match your server expectations
- Preserves all existing column names and types
- Maintains foreign key relationships
- Includes all indexes for performance

## 🚀 Deploy to Render with Postgres

### Step 1: Create Render Postgres Database
1. Go to your Render dashboard
2. Create a new **PostgreSQL** database
3. Note the connection string (it will look like: `$1***:***@$3

### Step 2: Update Render Service Environment
In your Render service settings, set these environment variables:

```bash
NODE_ENV=production
DATABASE_URL=$1***:***@$3?sslmode=require
COOKIE_SECRET=your-32-character-random-secret
DATA_DIR=/tmp
BILLING_ENABLED=0
KYC_ENABLED=0
```

### Step 3: Update Build/Start Commands
- **Build Command:** `npm ci --include=dev && npm run build:backend`
- **Start Command:** `npm run start:backend`

### Step 4: Deploy
1. Push your changes to your repository
2. Render will automatically:
   - Build the TypeScript backend
   - Run `prestart:backend` which detects Postgres
   - Execute `scripts/migrate-pg.cjs` to create tables
   - Optionally run `scripts/seed-pg.cjs` for basic data
   - Start your server

## 🔄 What Happens During Deployment

1. **Build Phase:**
   - Installs dependencies including `pg`
   - Compiles TypeScript to `dist/`

2. **Prestart Phase:**
   - Detects `DATABASE_URL` is Postgres
   - Runs `scripts/migrate-pg.cjs`
   - Creates `_migrations` table if needed
   - Applies all migrations from `scripts/migrations-pg/`
   - Runs `scripts/seed-pg.cjs` for basic data

3. **Start Phase:**
   - Starts your server from `dist/server/index.js`
   - Server connects to Postgres using `DATABASE_URL`

## 📊 Optional: Data Migration from SQLite

If you have existing data in SQLite that you want to migrate:

### Export from SQLite (locally):
```bash
# Export plans
sqlite3 data/app.db -header -csv "SELECT * FROM plans" > plans.csv

# Export users (exclude password hashes if you prefer to reset)
sqlite3 data/app.db -header -csv "SELECT id,email,password,is_admin,role,created_at,updated_at FROM user" > users.csv
```

### Import to Postgres:
```bash
# Set your Render Postgres URL
export DATABASE_URL="$1***:***@$3?sslmode=require"

# Import data
psql "$DATABASE_URL" -c "\copy plans FROM 'plans.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy \"user\"(id,email,password,is_admin,role,created_at,updated_at) FROM 'users.csv' CSV HEADER"
```

## 🧪 Testing Locally

To test the Postgres migration locally:

```bash
# Set a test Postgres URL (requires local Postgres)
export DATABASE_URL="$1***:***@$3

# Run the migration
node scripts/migrate-pg.cjs

# Run the seed
node scripts/seed-pg.cjs

# Test prestart
node scripts/prestart.cjs
```

## 🔍 Verification

After deployment, check that:
1. Your app starts successfully on Render
2. Database tables are created (check Render Postgres dashboard)
3. Basic plan data is seeded
4. Your UI works exactly as before

## 📝 Notes

- **No UI Changes:** Your frontend remains exactly the same
- **Backward Compatible:** Local development still uses SQLite
- **Production Ready:** Postgres provides better performance and reliability
- **Migration Safe:** Uses transaction-wrapped migrations for safety

The migration is designed to be zero-downtime and maintains full compatibility with your existing codebase.
