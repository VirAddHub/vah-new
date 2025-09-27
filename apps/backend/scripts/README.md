# Database Management Scripts

This directory contains scripts for securely managing user accounts and passwords in the PostgreSQL database.

## Scripts Overview

### 1. `admin-set-password.ps1` (PowerShell)
Securely updates admin passwords with proper bcrypt hashing and password strength validation.

**Usage:**
```powershell
# Set your database URL
$env:DATABASE_URL = 'postgresql://user:pass@host:port/dbname?sslmode=require'

# Run the script
.\scripts\admin-set-password.ps1

# Or specify a different email
.\scripts\admin-set-password.ps1 -Email "admin@example.com"
```

### 2. `admin-set-password.sh` (Bash/Zsh)
Cross-platform version of the admin password script.

**Usage:**
```bash
# Set your database URL
export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'

# Run the script
./scripts/admin-set-password.sh

# Or specify a different email
./scripts/admin-set-password.sh admin@example.com
```

### 3. `create-users-node.mjs` (Node.js)
Creates both admin and worker users using environment variables for secure password management.

**Usage:**
```bash
# Set environment variables
export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'
export ADMIN_PASSWORD='YourStrongAdminPassword123!'
export WORKER_PASSWORD='YourStrongWorkerPassword123!'

# Run the script
node scripts/create-users-node.mjs
```

## Password Requirements

All scripts enforce strong password requirements:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Security Features

- **Bcrypt Hashing**: All passwords are hashed using bcrypt with 12 rounds
- **No Plain Text**: Passwords are never stored or logged in plain text
- **Environment Variables**: Sensitive data is passed via environment variables
- **Input Validation**: All inputs are validated and sanitized
- **Verification**: All operations are verified after completion

## Database Schema

The scripts work with the following user table structure:
```sql
CREATE TABLE "user" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50),
  is_admin BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at BIGINT,
  updated_at BIGINT
);
```

## Troubleshooting

### PowerShell Issues
If you encounter PowerShell console issues, try:
1. Use the bash version instead: `./scripts/admin-set-password.sh`
2. Use the Node.js version: `node scripts/create-users-node.mjs`

### Database Connection Issues
- Ensure `DATABASE_URL` is properly formatted
- Check that PostgreSQL client tools are installed
- Verify network connectivity to the database

### Permission Issues
- Ensure the database user has INSERT/UPDATE permissions
- Check that the `pgcrypto` extension is installed: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

## Best Practices

1. **Remove Environment Variables**: After creating users, remove password environment variables from your deployment environment
2. **Rotate Passwords**: Regularly rotate admin passwords
3. **Use Strong Passwords**: Always use strong, unique passwords
4. **Test Logins**: After creating users, test login functionality
5. **Monitor Access**: Keep track of admin account usage

## Example Workflow

1. **Set up database connection:**
   ```bash
   export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'
   ```

2. **Create initial users:**
   ```bash
   export ADMIN_PASSWORD='AdminPass123!'
   export WORKER_PASSWORD='WorkerPass123!'
   node scripts/create-users-node.mjs
   ```

3. **Update admin password later:**
   ```bash
   ./scripts/admin-set-password.sh
   ```

4. **Clean up environment:**
   ```bash
   unset ADMIN_PASSWORD
   unset WORKER_PASSWORD
   ```
