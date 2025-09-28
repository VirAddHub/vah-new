# Render Deployment Configuration

## Backend Deployment Settings

Configure your Render service with these exact settings:

### Service Configuration
- **Root Directory**: `apps/backend`
- **Install Command**: `npm ci --include=dev`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Environment Variables
Set these environment variables in the Render dashboard:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Admin Access
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!

# Email Service (Postmark)
POSTMARK_API_TOKEN=your-postmark-api-token
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# Payment Processing (Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key

# KYC Service (Sumsub)
SUMSUB_APP_TOKEN=your-sumsub-app-token
SUMSUB_SECRET_KEY=your-sumsub-secret-key

# Security
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# CORS
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app

# Production Settings
NODE_ENV=production
DISABLE_SQLITE=true
```

## Previous Error Resolution

The previous error:
```
npm ci ... EUSAGE: The `npm ci` command can only install with an existing package-lock.json
```

Was caused by missing `package-lock.json` in the `apps/backend` directory. This has been fixed by:

1. Creating a root `package-lock.json` with workspace dependencies
2. Ensuring `apps/backend/package-lock.json` exists for Render's `npm ci` command
3. Configuring proper workspace structure

## Build Process

1. Render sets `apps/backend` as root directory
2. Runs `npm ci --include=dev` to install dependencies
3. Runs `npm run build` to compile TypeScript and prepare dist files
4. Runs `npm start` to start the server with `node dist/server/server.js`

## Health Check

The backend exposes health check endpoints:
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness probe
- `GET /api/healthz` - Kubernetes-style health check
