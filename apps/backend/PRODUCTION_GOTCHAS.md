# Production Deployment Gotchas & Settings

## 🚨 Critical Gotchas to Avoid

### 1. **Body Parsers BEFORE Routes**
```js
// ✅ CORRECT ORDER
app.use(express.json());           // Body parser first
app.use('/api/contact', contact);  // Routes after
app.use('/api/auth', auth);        // Routes after

// ❌ WRONG - Routes before body parser
app.use('/api/contact', contact);  // This will fail!
app.use(express.json());           // Too late
```

### 2. **Cookies + CORS Configuration**
```js
// ✅ CORRECT CORS setup
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,  // CRITICAL for cookie auth
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ✅ Frontend must include credentials
fetch('/api/admin/users', {
  credentials: 'include',  // CRITICAL
  headers: { 'Content-Type': 'application/json' }
});
```

### 3. **Postmark MessageStream**
```js
// ✅ Use "outbound" (default stream)
await client.sendEmail({
  From: process.env.POSTMARK_FROM,
  To: process.env.POSTMARK_TO,
  MessageStream: 'outbound',  // Default stream
  Subject: 'Test',
  TextBody: 'Test message'
});

// ❌ Custom streams must exist in Postmark account
MessageStream: 'custom-stream'  // Will fail if not configured
```

### 4. **Email Mocking in Production**
```bash
# ✅ PRODUCTION - Send real emails
MOCK_EMAIL=0

# ❌ DEVELOPMENT ONLY - Don't send real emails
MOCK_EMAIL=1
```

### 5. **Rate Limiter Store**
```js
// ✅ Single instance (current setup)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // Uses in-memory store (fine for single instance)
});

// 🔄 MULTI-INSTANCE PRODUCTION - Use Redis
const RedisStore = require('rate-limit-redis');
const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5
});
```

### 6. **Background Jobs Feature Flags**
```bash
# ✅ START WITH DISABLED
DISABLE_STORAGE_EXPIRY_SCAN=1

# ✅ ENABLE AFTER STABLE DEPLOYMENTS
DISABLE_STORAGE_EXPIRY_SCAN=0
```

### 7. **Test Bridge Security**
```js
// ✅ Test bridge only for dev/specific headers
if (!req.user && process.env.NODE_ENV !== "production") {
  const devId = Number(req.header("x-dev-user-id") || 0);
  if (devId) {
    req.user = { id: devId, email: `dev+${devId}@local`, is_admin: true };
  }
}
// Never expose this in production UI!
```

## 🎯 Render Production Settings

### Backend Environment Variables
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
JWT_SECRET=your-super-secret-production-jwt-key-min-32-chars
JWT_COOKIE=vah_session

# Production
NODE_ENV=production
PORT=4000

# Feature Flags (start conservative)
MOCK_EMAIL=0
HOURLY_EXPORTS_ENABLED=false
DISABLE_STORAGE_EXPIRY_SCAN=1
DISABLE_INVOICE_CLEANUP=0
```

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_BASE=https://your-backend-url.onrender.com
NEXT_PUBLIC_BASE_URL=https://www.virtualaddresshub.co.uk
```

### Render Service Configuration
```yaml
# Start Command
npm run start

# Health Check Path
/api/health

# Build Command
npm run build:backend

# Node Version
18.x
```

## 🧪 Pre-Deployment Verification

### 1. Health Check
```bash
curl -i https://your-backend-url.onrender.com/api/health
# Expected: 200 {"status":"ok","timestamp":"...","uptime":123.45,"version":"..."}
```

### 2. CORS + Credentials Test
```bash
# Login (sets cookie)
curl -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com"}' \
  https://your-backend-url.onrender.com/api/auth/login

# Admin endpoint with cookie
curl -i -b cookies.txt \
  https://your-backend-url.onrender.com/api/admin/users
# Expected: 200 with JSON user list
```

### 3. Contact API Test
```bash
# Happy path
curl -i -H 'Content-Type: application/json' -d \
'{"name":"Test","email":"test@example.com","subject":"Hi","message":"Hello","website":""}' \
https://your-backend-url.onrender.com/api/contact
# Expected: 200 {"ok":true}

# Honeypot test
curl -i -H 'Content-Type: application/json' -d \
'{"name":"Bot","email":"bot@x.y","subject":"S","message":"M","website":"http://spam"}' \
https://your-backend-url.onrender.com/api/contact
# Expected: 400 {"error":"Spam detected"}
```

### 4. Rate Limiting Test
```bash
# Send 6 requests quickly (within 15 minutes)
for i in {1..6}; do
  curl -X POST https://your-backend-url.onrender.com/api/contact \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Rate Test $i\",\"email\":\"ratetest$i@example.com\",\"subject\":\"Test\",\"message\":\"Test\",\"website\":\"\"}"
done
# Expected: First 5 succeed, 6th returns 429
```

### 5. Dev UI Security
```bash
# Check that DevButtons doesn't render in production
curl -s https://your-frontend-url.com | grep -i "dev tools" || echo "✅ Dev UI not in production"
```

## 🚀 Post-Deployment Checklist

- [ ] Health endpoint returns 200
- [ ] Contact form works (test with real email)
- [ ] Admin login works
- [ ] CORS allows credentials
- [ ] Rate limiting works
- [ ] Honeypot protection works
- [ ] No console errors in browser
- [ ] No infinite recursion in backend logs
- [ ] Email delivery works (check Postmark dashboard)
- [ ] Database connections stable

## 🔧 Troubleshooting Common Issues

### 401 Unauthorized
- Check CORS credentials: true
- Verify Origin matches ALLOWED_ORIGINS exactly
- Ensure frontend uses credentials: 'include'

### 500 Internal Server Error
- Check console.error recursion (should be fixed)
- Verify SQL query structure
- Check environment variables

### Email Not Sending
- Verify MOCK_EMAIL=0 in production
- Check Postmark token validity
- Verify MessageStream: 'outbound'

### Rate Limiting Not Working
- Check if using multi-instance (need Redis)
- Verify rate limiter is before routes
- Check windowMs and max values

## 📈 Next Steps (Nice-to-Have)

1. **Forwarding Requests Persistence**
   - Replace in-memory store with database
   - Survive server restarts

2. **Email Notifications**
   - Notify customers on status changes
   - Approved/fulfilled notifications

3. **Playwright CI**
   - Run E2E tests on every push
   - Set MOCK_EMAIL=1 in CI

4. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor database connections
   - Track email delivery rates
