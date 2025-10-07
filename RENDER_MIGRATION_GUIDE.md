# Render Migration Guide

## 🚀 **Bulletproof SQL Migration Runner**

This guide shows you how to run the forwarding system migrations on your Render PostgreSQL database using a Node.js migration runner that works from within your Render service.

## 📁 **Files Created**

### 1. **`apps/backend/src/scripts/migrate-sql.ts`**
- Node.js migration runner script
- No `psql` dependency required
- Works with `DATABASE_URL` environment variable
- Transactional safety (rollback on failure)

### 2. **`apps/backend/package.json`**
- Added `migrate:sql` npm script
- Points to the compiled migration runner

## 🔧 **Deploy the Migration Runner**

### **Step 1: Commit and Push**
```bash
git add apps/backend/src/scripts/migrate-sql.ts apps/backend/package.json
git commit -m "chore(db): add SQL migration runner (no psql needed)"
git push
```

### **Step 2: Wait for Render Deployment**
- Render will automatically deploy your backend service
- The migration runner will be compiled and available in `dist/src/scripts/migrate-sql.js`

## 🏃 **Run Migrations from Render Service**

### **Step 1: SSH into Your Render Service**
```bash
render services ssh srv-d2s9o38gjchc73e10qsg
```

### **Step 2: Verify Environment**
```bash
# Check DATABASE_URL is set
printenv DATABASE_URL | sed 's/^.*/DATABASE_URL is set ✔/'

# Check Node.js version
node -v

# Check migration runner is built
ls -la dist/src/scripts/migrate-sql.js
```

### **Step 3: Dry Run (List Files, No DB Changes)**
```bash
node dist/src/scripts/migrate-sql.js migrations --dry-run
```

### **Step 4: Run Forwarding Migrations (025-029)**
```bash
node dist/src/scripts/migrate-sql.js migrations --from=25 --to=29
```

### **Step 5: Verify Results**
```bash
# Check if tables were created
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  return client.query('SELECT table_name FROM information_schema.tables WHERE table_name LIKE \\'forwarding%\\' ORDER BY table_name');
}).then(result => {
  console.log('Forwarding tables:', result.rows.map(r => r.table_name));
  client.end();
}).catch(console.error);
"
```

## 🎯 **Migration Commands**

### **Run All Migrations**
```bash
node dist/src/scripts/migrate-sql.js migrations
```

### **Run Specific Range**
```bash
node dist/src/scripts/migrate-sql.js migrations --from=25 --to=29
```

### **Run Single File**
```bash
node dist/src/scripts/migrate-sql.js --file=migrations/025_forwarding_charges.sql
```

### **Dry Run (No Changes)**
```bash
node dist/src/scripts/migrate-sql.js migrations --dry-run
```

### **Using NPM Script**
```bash
npm run migrate:sql -- --from=25 --to=29
```

## 🔍 **What Gets Migrated**

### **Migration 025: Forwarding Charges**
- Creates `forwarding_charge` table
- Tracks £2 forwarding fees for non-official mail

### **Migration 026: Enhanced Forwarding System**
- Creates `forwarding_request` table with enhanced schema
- Creates `forwarding_outbox` table for retryable events
- Adds indexes for performance

### **Migration 027: Admin Forwarding System**
- Adds admin management columns to `forwarding_request`
- Adds timestamps for each status change
- Adds courier and tracking fields

### **Migration 028: Forwarding Performance**
- Adds trigram indexes for fuzzy search
- Adds composite indexes for common queries

### **Migration 029: Forwarding Trigger**
- Adds trigger to mirror status changes to `mail_item`
- Adds `forwarding_status` column to `mail_item`

## 🛡️ **Safety Features**

### **Transactional Safety**
- All migrations run in a single transaction
- If any migration fails, everything is rolled back
- No partial state corruption

### **Dry Run Mode**
- Test migrations without making changes
- Lists all files that would be executed
- Perfect for verification

### **Error Handling**
- Clear error messages with stack traces
- Automatic rollback on failure
- Exit codes for scripting

## 🚨 **Troubleshooting**

### **Migration Fails**
```bash
# Check the error message
node dist/src/scripts/migrate-sql.js migrations --from=25 --to=29

# Fix the issue and re-run
# The transaction will rollback automatically
```

### **Database Connection Issues**
```bash
# Verify DATABASE_URL is set
printenv DATABASE_URL

# Test connection
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  console.log('✅ Database connection successful');
  client.end();
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});
"
```

### **File Not Found**
```bash
# Check if migration runner exists
ls -la dist/src/scripts/migrate-sql.js

# If not, rebuild
npm run build
```

## ✅ **Verification Checklist**

After running migrations, verify:

- [ ] `forwarding_request` table exists
- [ ] `forwarding_charge` table exists
- [ ] `forwarding_outbox` table exists
- [ ] `mail_item` has `forwarding_status` column
- [ ] All indexes are created
- [ ] Trigger is working
- [ ] E2E tests pass

## 🎉 **Success!**

Once migrations are complete, your forwarding system will be ready for the E2E tests:

```bash
# Run the E2E verification
./verify-forwarding-e2e.sh
```

The migration runner is bulletproof and will work reliably from within your Render service where `DATABASE_URL` is already configured and working.
