# Render Environment Configuration

## Backend Server (https://vah-api-staging.onrender.com)

Set these environment variables in your Render dashboard:

```bash
# Database
DATABASE_URL=postgresql://vah_postgres_user:kBfz1ZAPRaUKwJANuYBqEz1NZz6WgTn7@dpg-d2vikgnfte5s73c5nv80-a.frankfurt-postgres.render.com/vah_postgres

# CORS Configuration
CORS_ORIGINS=https://vah-frontend-final.vercel.app,http://localhost:3000

# Authentication
JWT_SECRET=your-jwt-secret-key-change-in-production
SESSION_SECRET=your-session-secret-key-change-in-production

# Security
DISABLE_SQLITE=true

# Application
NODE_ENV=production
PORT=8080

# Optional: Vercel Preview Support
ALLOW_VERCEL_PREVIEWS=true
VERCEL_PROJECT_PREFIX=vah-frontend-final
```

## Frontend (Vercel)

Set these environment variables in your Vercel dashboard:

```bash
# Backend API
BACKEND_API_ORIGIN=https://vah-api-staging.onrender.com

# Environment
NODE_ENV=production
```

## Database Connection

Your PostgreSQL database is already configured:
- **Host**: dpg-d2vikgnfte5s73c5nv80-a.frankfurt-postgres.render.com
- **Database**: vah_postgres
- **User**: vah_postgres_user
- **Password**: kBfz1ZAPRaUKwJANuYBqEz1NZz6WgTn7
- **SSL**: Required (automatically handled by Render)

## Testing Endpoints

After deployment, test these endpoints:

1. **Health Check**: https://vah-api-staging.onrender.com/api/ready
2. **CORS Test**: https://vah-api-staging.onrender.com/api/auth/login
3. **Frontend Diagnostic**: https://vah-frontend-final.vercel.app/api/_diag/env

## Acceptance Tests

Run these curl commands to verify deployment:

```bash
# 1. CORS Preflight Test
curl -i -X OPTIONS 'https://vah-api-staging.onrender.com/api/auth/login' \
  -H 'origin: https://vah-frontend-final.vercel.app' \
  -H 'access-control-request-method: POST' \
  -H 'access-control-request-headers: content-type'

# 2. Login Test (should return 200/401, not 500)
curl -i 'https://vah-api-staging.onrender.com/api/auth/login' \
  -H 'origin: https://vah-frontend-final.vercel.app' \
  -H 'content-type: application/json' \
  --data '{"email":"admin@virtualaddresshub.co.uk","password":"AdminPass123!"}'

# 3. Frontend Environment Check
curl -s 'https://vah-frontend-final.vercel.app/api/_diag/env' | jq
```

Expected results:
- ✅ CORS headers present (`access-control-allow-origin`, `access-control-allow-credentials`)
- ✅ Login returns 200/401 (not 500)
- ✅ Frontend shows correct backend origin
- ✅ Server logs show "=== ROUTES MOUNTED ===" with all endpoints
