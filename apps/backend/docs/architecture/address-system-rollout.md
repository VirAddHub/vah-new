# Address System Production Rollout Checklist

## 🎯 **Quick Production Test (5 minutes)**

### Step 1: Seed Database
Run in your Render Postgres console:

```sql
-- Copy and paste from scripts/seed-address-data.sql
-- This creates 1 location + 200 address slots
```

### Step 2: Test API Endpoints
```bash
# Replace YOUR_API_URL with your actual Render API URL
./scripts/test-address-api.sh https://your-api.onrender.com 42
```

### Step 3: Verify Capacity
```sql
-- Copy and paste from scripts/monitor-address-capacity.sql
-- Should show 200 available slots
```

## 🔧 **Manual API Testing**

### Assign Address
```bash
curl -X POST https://YOUR_API/api/me/address/assign \
  -H "x-user-id: 42" \
  -H "content-type: application/json" \
  -d '{"locationId":1}'
```

### Read Address
```bash
curl -H "x-user-id: 42" https://YOUR_API/api/me/address
```

### Test Idempotency
```bash
# Run the assign command again - should return same address with "already": true
curl -X POST https://YOUR_API/api/me/address/assign \
  -H "x-user-id: 42" \
  -H "content-type: application/json" \
  -d '{"locationId":1}'
```

## 📊 **Monitoring Queries**

### Check Capacity
```sql
SELECT l.name, l.id,
       COUNT(*) FILTER (WHERE s.status='available') AS free,
       COUNT(*) FILTER (WHERE s.status='assigned')  AS used
FROM public.location l
LEFT JOIN public.address_slot s ON s.location_id = l.id
GROUP BY l.name, l.id;
```

### Recent Assignments
```sql
SELECT s.id, s.mailbox_no, s.assigned_to, s.assigned_at, l.name
FROM public.address_slot s
JOIN public.location l ON l.id = s.location_id
WHERE s.status='assigned'
ORDER BY s.assigned_at DESC
LIMIT 20;
```

## 🛠️ **Admin Tools**

### Release a Slot
```sql
UPDATE public.address_slot
SET status='available', assigned_to=NULL, assigned_at=NULL
WHERE id = $SLOT_ID;
```

### Move User to Different Slot
```sql
BEGIN;
UPDATE public.address_slot
SET status='available', assigned_to=NULL, assigned_at=NULL
WHERE assigned_to = $USER_ID AND status='assigned';

UPDATE public.address_slot
SET status='assigned', assigned_to=$USER_ID, assigned_at=NOW()
WHERE id = $TARGET_SLOT_ID AND status='available';
COMMIT;
```

## ✅ **Expected Results**

1. **Database**: 1 location, 200 available slots
2. **API Assignment**: Returns formatted UK address
3. **API Read**: Returns same address as assignment
4. **Idempotency**: Second assignment returns `"already": true`
5. **Capacity**: Shows 199 available, 1 assigned after test

## 🚨 **Troubleshooting**

- **401 Unauthorized**: Check `x-user-id` header
- **404 No Address**: User hasn't been assigned yet
- **409 No Addresses Available**: Pool is empty
- **500 Error**: Check server logs for SQL errors

## 🔗 **Integration Points**

- **Signup Flow**: Call `/api/me/address/assign` after successful registration
- **Payment Flow**: Call `/api/me/address/assign` after successful payment
- **Profile Page**: Display address from `/api/me/address`

## 📁 **Files Created**

- `scripts/seed-address-data.sql` - Database seeding
- `scripts/monitor-address-capacity.sql` - Monitoring queries
- `scripts/admin-address-fixes.sql` - Admin tools
- `scripts/test-address-api.sh` - API testing script
- `routes/address.js` - API endpoints
- `tests/address.test.js` - Unit tests
