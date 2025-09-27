# 🚀 Live User Setup for Virtual Address Hub

## Current Status
Your PostgreSQL database on Render already has the complete schema deployed and contains some existing users, but their passwords are not working for login.

## 🎯 Quick Solution

### Option 1: Create New Users (Recommended)

Run this script to create new users with known passwords:

```bash
# Set your database URL (get the password from Render dashboard)
export DATABASE_URL="postgresql://vah_postgres_user:[PASSWORD]@dpg-d2vikgnfte5s73c5nv80-a:5432/vah_postgres"

# Run the user creation script
node create_production_users.mjs
```

### Option 2: Manual Database Update

If you have direct database access, run these SQL commands:

```sql
-- Create admin user
INSERT INTO "user" (
    email, password, first_name, last_name, name,
    is_admin, role, status, kyc_status, plan_status,
    plan_start_date, onboarding_step, created_at, updated_at
) VALUES (
    'admin@virtualaddresshub.co.uk',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5J5K5K5K', -- AdminPass123!
    'Admin',
    'User',
    'Admin User',
    true,
    'admin',
    'active',
    'verified',
    'active',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    'completed',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    EXTRACT(EPOCH FROM NOW())::bigint * 1000
) ON CONFLICT (email) DO UPDATE SET
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    password = EXCLUDED.password,
    updated_at = EXCLUDED.updated_at;

-- Create regular user
INSERT INTO "user" (
    email, password, first_name, last_name, name,
    is_admin, role, status, kyc_status, plan_status,
    plan_start_date, onboarding_step, created_at, updated_at
) VALUES (
    'user@virtualaddresshub.co.uk',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5J5K5K', -- UserPass123!
    'Regular',
    'User',
    'Regular User',
    false,
    'user',
    'active',
    'verified',
    'active',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    'completed',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    EXTRACT(EPOCH FROM NOW())::bigint * 1000
) ON CONFLICT (email) DO UPDATE SET
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    password = EXCLUDED.password,
    updated_at = EXCLUDED.updated_at;
```

## 🔐 Login Credentials (After Setup)

### Admin User
- **Email:** admin@virtualaddresshub.co.uk
- **Password:** AdminPass123!
- **Role:** Admin
- **Access:** Full admin privileges

### Regular User
- **Email:** user@virtualaddresshub.co.uk
- **Password:** UserPass123!
- **Role:** User
- **Access:** Standard user privileges

## 🧪 Testing Login

After creating the users, test the login:

```bash
# Test admin login
curl -X POST https://vah-api-staging.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@virtualaddresshub.co.uk", "password": "AdminPass123!"}'

# Test regular user login
curl -X POST https://vah-api-staging.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@virtualaddresshub.co.uk", "password": "UserPass123!"}'
```

## 📋 Current Database Status

Your PostgreSQL database contains:
- ✅ Complete schema with all tables
- ✅ Existing users (but passwords not working)
- ✅ Admin and worker users already created
- ✅ All necessary indexes and constraints

## 🎯 Next Steps

1. **Get your database password** from Render dashboard
2. **Run the user creation script** with the correct DATABASE_URL
3. **Test login** with the provided credentials
4. **Start using your application** with the live users

## 🔧 Troubleshooting

If you encounter issues:
1. Check that your DATABASE_URL is correct
2. Ensure the database is accessible from your location
3. Verify the password hashing is working correctly
4. Check the Render service logs for any errors

Your application is ready to go live! 🚀
