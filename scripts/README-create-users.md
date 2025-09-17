# Creating Admin and Worker Users in Postgres

This directory contains several scripts to create admin and worker users in your Postgres database with bcrypt password hashing.

## Users to be Created

- **Admin**: `admin@yourdomain.com` / `CHANGE_ME_AFTER_FIRST_LOGIN`
- **Worker**: `worker@yourdomain.com` / `CHANGE_ME_AFTER_FIRST_LOGIN`

**⚠️ SECURITY WARNING**: Change passwords immediately after first login!

## Script Options

### 1. Direct SQL (Recommended)
```bash
# Get your DATABASE_URL from Render dashboard
psql "postgresql://user:pass@host:port/dbname" -f create-users-direct.sql
```

### 2. Bash Script
```bash
./create-users.sh "postgresql://user:pass@host:port/dbname"
```

### 3. Node.js Script
```bash
DATABASE_URL="postgresql://user:pass@host:port/dbname" node create-users-node.mjs
```

### 4. Via API (if setup secret is available)
```bash
ADMIN_SETUP_SECRET="your-secret" node create-users-via-api.mjs
```

## Getting Your DATABASE_URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to your Postgres database
3. Copy the "External Database URL" from the Connect tab
4. It should look like: `postgresql://user:pass@host:port/dbname`

## Features

- ✅ Uses bcrypt with cost factor 10 for password hashing
- ✅ Idempotent (safe to run multiple times)
- ✅ Creates both admin and worker users
- ✅ Sets proper roles and permissions
- ✅ Uses Postgres `pgcrypto` extension for secure hashing

## Verification

After running any script, you can verify the users were created:

```sql
SELECT email, first_name, last_name, role, is_admin, status, created_at 
FROM "user" 
WHERE email IN ('admin@yourdomain.com', 'worker@yourdomain.com')
ORDER BY email;
```

## Security Notes

- Change the default passwords after first login
- Update email addresses to your actual domain
- The passwords are hashed using bcrypt, not stored in plain text
- Users are created with proper role-based access control
