# Production Deployment Checklist

## Pre-Deployment Setup

### Backend Environment Variables (Render/Production)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_CLIENT=pg

# Email (Postmark)
POSTMARK_SERVER_TOKEN=pm_your_production_token
POSTMARK_FROM=support@virtualaddresshub.co.uk
POSTMARK_TO=support@virtualaddresshub.co.uk

# CORS & Security
ALLOWED_ORIGINS=https://www.virtualaddresshub.co.uk
JWT_SECRET=your-super-secret-production-jwt-key
JWT_COOKIE=vah_session

# Production
NODE_ENV=production
PORT=4000

# Remove these for production:
# MOCK_EMAIL=1  # ❌ Remove this
# DISABLE_STORAGE_EXPIRY_SCAN=1  # ❌ Remove this
```

### Frontend Environment Variables
```bash
# Backend API URL
NEXT_PUBLIC_API_BASE=https://your-backend-url.com

# App URL
NEXT_PUBLIC_BASE_URL=https://www.virtualaddresshub.co.uk
```

## Deployment Steps

### 1. Backend Deployment
- [ ] Set all environment variables in Render
- [ ] Ensure `MOCK_EMAIL` is NOT set (or set to 0)
- [ ] Ensure `DISABLE_STORAGE_EXPIRY_SCAN` is NOT set (or set to 0)
- [ ] Deploy backend
- [ ] Test health endpoint: `GET /api/health`
- [ ] Test contact form: `POST /api/contact`

### 2. Frontend Deployment
- [ ] Set `NEXT_PUBLIC_API_BASE` to your backend URL
- [ ] Build succeeds: `npm run build`
- [ ] Deploy frontend
- [ ] Test contact form on live site

### 3. Post-Deployment Verification
- [ ] Contact form works (test with real email)
- [ ] Admin login works
- [ ] Mail forwarding requests work
- [ ] Database connections stable
- [ ] No console errors in browser
- [ ] No infinite recursion errors in backend logs

## Smoke Tests

Run these after deployment:

```bash
# Health check
curl https://your-backend-url.com/api/health

# Contact form test
curl -X POST https://your-backend-url.com/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test","website":""}'

# Honeypot test
curl -X POST https://your-backend-url.com/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Spam","email":"spam@example.com","subject":"Spam","message":"Spam","website":"http://spam.com"}'
```

## Rollback Plan

If issues occur:
1. Set `DISABLE_STORAGE_EXPIRY_SCAN=1` to disable background jobs
2. Set `MOCK_EMAIL=1` to disable email sending
3. Check backend logs for errors
4. Rollback to previous deployment if needed

## Monitoring

- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Monitor database connection pool
- [ ] Monitor email delivery rates
- [ ] Set up uptime monitoring for `/api/health`
