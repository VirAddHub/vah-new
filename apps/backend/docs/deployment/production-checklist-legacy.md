# 🚀 Address System Production Checklist

## ✅ **Pre-Deploy (5 minutes)**

### 1. Verify Render Configuration
- [ ] **Build Command:** `npm ci && npm run build`
- [ ] **Start Command:** `npm run start`
- [ ] **Manual Deploy** → **Clear build cache & Deploy**

### 2. Check Boot Logs
Look for these in Render logs:
```
[prestart] running schema repair
[prestart] ✅ dist build verified clean
[boot] build: { commit: "...", builtAt: "..." }
[schema] export_job.storage_expires_at present: false
[export-jobs] Hourly cleanup scheduled (locked)
```

**❌ If you see:** `cd dist && node server/index.js` → Render is using old config

## 🗄️ **Database Setup (2 minutes)**

### 1. Run Migration
The migration runs automatically via prestart script.

### 2. Seed Data
Run in **Render PostgreSQL console**:
```sql
-- Copy from scripts/seed-production.sql
```

**Expected result:** 1 location, 200 available slots

## 🧪 **API Testing (3 minutes)**

### 1. Test Basic Functionality
```bash
# Replace with your actual API URL
./scripts/test-production-api.sh https://api.virtualaddresshub.co.uk 42
```

### 2. Manual Testing
```bash
# Assign address
curl -X POST https://YOUR_API/api/me/address/assign \
  -H "x-user-id: 42" \
  -H "content-type: application/json" \
  -d '{"locationId":1}'

# Read address
curl -H "x-user-id: 42" https://YOUR_API/api/me/address
```

**Expected results:**
- ✅ 200 OK responses
- ✅ Properly formatted UK address
- ✅ Idempotent assignment (`"already": true`)

## 📊 **Monitoring (1 minute)**

### 1. Check Capacity
Run in **PostgreSQL console**:
```sql
-- Copy from scripts/monitor-production.sql
```

**Expected:** 200 total slots, decreasing available count after tests

## 🔗 **Integration (When Ready)**

### 1. Add to Signup/Payment Flow
```js
const { assignAddressToUser } = require('./lib/address-assignment');

// After successful signup/payment
const result = await assignAddressToUser(userId, 1);
if (result.success) {
  console.log('Address assigned:', result.address.components.suite);
} else {
  console.error('Address assignment failed:', result.error);
}
```

### 2. Update Auth Middleware
Replace `x-user-id` header with your real authentication:
```js
// In routes/address.js, update requireUser middleware
function requireUser(req, res, next) {
  // Use your existing auth logic here
  if (!req.user?.id) return res.status(401).json({ ok: false, message: 'Unauthenticated' });
  next();
}
```

## 🚨 **Troubleshooting**

### Common Issues:
- **401 Unauthorized:** Check authentication headers
- **404 No Address:** User hasn't been assigned yet
- **409 No Addresses Available:** Pool is empty
- **500 Error:** Check server logs for SQL errors

### Debug Commands:
```bash
# Check if API is responding
curl -I https://YOUR_API/api/health

# Check specific endpoint
curl -v https://YOUR_API/api/me/address -H "x-user-id: 42"
```

## 📈 **Success Metrics**

After testing, you should see:
- ✅ 200 available slots initially
- ✅ Decreasing available count after assignments
- ✅ No duplicate user assignments
- ✅ Proper address formatting
- ✅ Idempotent behavior

## 🎯 **Next Steps**

1. **Monitor capacity** daily
2. **Add email notifications** (optional)
3. **Create admin dashboard** (optional)
4. **Scale to multiple locations** (when needed)

---

**Total time to production:** ~10 minutes
**System status:** Production ready! 🚀
