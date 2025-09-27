# Security Configuration Guide

## Frontend Security (Implemented)

### ✅ Security Headers (next.config.js)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: Restrictive CSP
- Disabled x-powered-by header

### ✅ Input Validation (api-client.ts)
- Email format validation
- Password strength validation
- Input sanitization (XSS prevention)
- Required field validation

## Backend Security (Render - To Implement)

### 🔧 CORS Security
```javascript
const cors = require('cors');

const allowlist = [
  'https://vah-frontend-final.vercel.app',
  // Add localhost for development
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : []),
];

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
});

app.use(corsMiddleware);
```

### 🔧 Security Headers
```javascript
const helmet = require('helmet');

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

### 🔧 Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });
const contactLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/contact', contactLimiter, contactHandler);
```

### 🔧 Secure Cookies
```javascript
const isProd = process.env.NODE_ENV === 'production';
res.cookie('vah_session', token, {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  domain: isProd ? '.virtualaddresshub.co.uk' : undefined,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
});
```

### 🔧 Authentication Middleware
```javascript
export function requireAuth(req, res, next) {
  const token = req.cookies?.vah_session || '';
  if (!token) return res.status(401).json({ ok:false, error:'unauthorised' });
  // TODO: verify token / lookup session
  req.user = { id: 123, role: 'user' }; // replace with real lookup
  next();
}
```

## Environment Variables (Render Backend)

### Staging
```
NODE_ENV=production
FRONTEND_ORIGIN=https://vah-frontend-final.vercel.app,https://vah-frontend-final.vercel.app
SESSION_SECRET=<long-random>
GOCARDLESS_WEBHOOK_SECRET=<sandbox>
SUMSUB_WEBHOOK_SECRET=<staging>
```

### Production
```
NODE_ENV=production
FRONTEND_ORIGIN=https://vah-frontend-final.vercel.app
SESSION_SECRET=<long-random>
GOCARDLESS_WEBHOOK_SECRET=<production>
SUMSUB_WEBHOOK_SECRET=<production>
COOKIE_DOMAIN=.virtualaddresshub.co.uk
```

## Testing Commands

### CORS Preflight Test
```bash
curl -i -X OPTIONS https://vah-api-staging.onrender.com/api/auth/whoami \
  -H "Origin: https://vah-frontend-final.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

### Authentication Test
```bash
# Unauthenticated (expect 401)
curl -i https://vah-api-staging.onrender.com/api/auth/whoami

# Login (expect Set-Cookie)
curl -i -X POST https://vah-api-staging.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# Authenticated with cookie
curl -i https://vah-api-staging.onrender.com/api/auth/whoami \
  -H "Cookie: vah_session=<cookie>"
```

### Rate Limiting Test
```bash
for i in {1..6}; do \
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://vah-api-staging.onrender.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"email":"test@x.com","message":"hello"}'; \
done
```

## Security Checklist

### Frontend (✅ Complete)
- [x] Security headers configured
- [x] Input validation implemented
- [x] XSS protection enabled
- [x] CSP policy configured
- [x] HTTPS enforcement

### Backend (🔧 To Implement)
- [ ] CORS origin restriction
- [ ] Rate limiting enabled
- [ ] Secure cookie configuration
- [ ] Authentication middleware
- [ ] Webhook signature verification
- [ ] Input sanitization
- [ ] Error handling without information leakage
- [ ] Logging and monitoring
