# Forwarding System Test Checklist

## Pre-Test Setup ✅

- [ ] **Environment Variable Set**
  - [ ] `INTERNAL_CRON_TOKEN` added to backend environment
  - [ ] Backend service redeployed with new environment variable
  - [ ] Token value noted for testing

- [ ] **Database Migration**
  - [ ] Migration `026_enhanced_forwarding_system.sql` executed
  - [ ] New tables created: `forwarding_request`, `forwarding_charge`, `forwarding_outbox`
  - [ ] Indexes and constraints applied

- [ ] **Code Deployment**
  - [ ] Backend code deployed with new forwarding system
  - [ ] All new modules and routes are active
  - [ ] Build completed successfully

## Test 1: Basic Forwarding Request ✅

**Command:**
```bash
API_BASE="https://vah-api-staging.onrender.com"
AUTH="Bearer YOUR_JWT_TOKEN"
MAIL_ID=25

curl -sS -X POST "$API_BASE/api/forwarding/requests" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fr-$MAIL_ID-$(date +%s)" \
  -d '{
    "mail_item_id": '"$MAIL_ID"',
    "to_name": "Jane Smith",
    "address1": "10 Downing Street",
    "address2": "",
    "city": "London",
    "state": "",
    "postal": "SW1A 2AA",
    "country": "GB",
    "reason": "Client request",
    "method": "Royal Mail Tracked"
  }'
```

**Expected Results:**
- [ ] Status: `201 Created` or `200 OK`
- [ ] Response: `{"ok": true, "data": {"forwarding_request": {...}}}`
- [ ] Forwarding request ID returned
- [ ] No errors in response

**Database Verification:**
```sql
-- Check forwarding request created
SELECT id, user_id, mail_item_id, status, to_name, address1, city, postal
FROM forwarding_request 
WHERE mail_item_id = 25 
ORDER BY created_at DESC LIMIT 1;

-- Check charge created (for non-official mail)
SELECT id, forwarding_request_id, amount_pence, status
FROM forwarding_charge 
WHERE forwarding_request_id = <fr_id>;

-- Check outbox event created
SELECT id, forwarding_request_id, event, status, payload_json
FROM forwarding_outbox 
WHERE forwarding_request_id = <fr_id>;
```

## Test 2: Idempotency Test ✅

**Command:**
```bash
# Same request with same Idempotency-Key
curl -sS -X POST "$API_BASE/api/forwarding/requests" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fr-$MAIL_ID-same" \
  -d '{
    "mail_item_id": 25,
    "to_name": "Jane Smith",
    "address1": "10 Downing Street",
    "address2": "",
    "city": "London",
    "state": "",
    "postal": "SW1A 2AA",
    "country": "GB",
    "reason": "Client request",
    "method": "Royal Mail Tracked"
  }'
```

**Expected Results:**
- [ ] Status: `201 Created` or `200 OK`
- [ ] Same forwarding request ID returned
- [ ] No duplicate charges created
- [ ] No duplicate outbox events

**Database Verification:**
```sql
-- Should still be only one request
SELECT COUNT(*) FROM forwarding_request WHERE mail_item_id = 25;

-- Should still be only one charge
SELECT COUNT(*) FROM forwarding_charge WHERE forwarding_request_id = <fr_id>;

-- Should still be only one outbox event
SELECT COUNT(*) FROM forwarding_outbox WHERE forwarding_request_id = <fr_id>;
```

## Test 3: Outbox Draining ✅

**Command:**
```bash
CRON_TOKEN="YOUR_INTERNAL_CRON_TOKEN"

curl -sS -X POST "$API_BASE/api/internal/forwarding/drain" \
  -H "x-internal-cron-token: $CRON_TOKEN"
```

**Expected Results:**
- [ ] Status: `200 OK`
- [ ] Response: `{"ok": true}`
- [ ] No authentication errors

**Database Verification:**
```sql
-- Check outbox status changed to 'sent'
SELECT id, status, attempt_count, last_error
FROM forwarding_outbox 
WHERE forwarding_request_id = <fr_id>;

-- Should show status = 'sent' and attempt_count = 1
```

## Test 4: Error Handling ✅

**Test Invalid Token:**
```bash
curl -sS -X POST "$API_BASE/api/internal/forwarding/drain" \
  -H "x-internal-cron-token: invalid-token"
```

**Expected Results:**
- [ ] Status: `401 Unauthorized`
- [ ] Response: `{"ok": false, "error": "unauthorized"}`

**Test Invalid Mail Item:**
```bash
curl -sS -X POST "$API_BASE/api/forwarding/requests" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "mail_item_id": 99999,
    "to_name": "Test User",
    "address1": "123 Test St",
    "city": "London",
    "postal": "SW1A 1AA"
  }'
```

**Expected Results:**
- [ ] Status: `404 Not Found` or `403 Forbidden`
- [ ] Appropriate error message

## Test 5: Official Mail (Free) ✅

**Test with HMRC Mail:**
```bash
# First, create a mail item with HMRC tag (if possible)
# Then test forwarding - should be free
```

**Expected Results:**
- [ ] Forwarding request created successfully
- [ ] No charge created in `forwarding_charge` table
- [ ] Outbox event shows `is_official: true`

## Test 6: Cron Job Setup ✅

**Manual Cron Test:**
```bash
# Test the exact command that will be used in cron
curl -sS -X POST https://vah-api-staging.onrender.com/api/internal/forwarding/drain \
  -H "x-internal-cron-token: ${INTERNAL_CRON_TOKEN}"
```

**Expected Results:**
- [ ] Command executes successfully
- [ ] Returns `{"ok": true}`
- [ ] No authentication errors

**Render Cron Job Setup:**
- [ ] Cron job created in Render dashboard
- [ ] Schedule set to `*/5 * * * *` (every 5 minutes)
- [ ] Command configured correctly
- [ ] Environment variable inherited
- [ ] Cron job enabled and running

## Test 7: Monitoring ✅

**Check Cron Job Logs:**
- [ ] Cron job appears in Render dashboard
- [ ] Recent executions show success
- [ ] No error messages in logs

**Check Database State:**
```sql
-- Overall outbox status
SELECT status, COUNT(*) as count
FROM forwarding_outbox 
GROUP BY status;

-- Recent activity
SELECT 
  fr.id,
  fr.status,
  fr.to_name,
  fr.city,
  fo.status as outbox_status,
  fo.attempt_count,
  fc.amount_pence
FROM forwarding_request fr
LEFT JOIN forwarding_outbox fo ON fo.forwarding_request_id = fr.id
LEFT JOIN forwarding_charge fc ON fc.forwarding_request_id = fr.id
ORDER BY fr.created_at DESC
LIMIT 10;
```

## Performance Tests ✅

**Load Test (Optional):**
- [ ] Create multiple forwarding requests quickly
- [ ] Verify all are processed correctly
- [ ] Check outbox drains all events
- [ ] No duplicate charges created

**Concurrent Test (Optional):**
- [ ] Multiple users create forwarding requests simultaneously
- [ ] All requests processed correctly
- [ ] No race conditions or deadlocks

## Cleanup ✅

**After Testing:**
- [ ] Remove test forwarding requests if needed
- [ ] Clean up test data
- [ ] Document any issues found
- [ ] Update configuration if needed

## Success Criteria ✅

- [ ] All tests pass without errors
- [ ] Idempotency works correctly
- [ ] Outbox drains successfully
- [ ] Cron job runs automatically
- [ ] No duplicate charges or requests
- [ ] Error handling works properly
- [ ] Official mail is free, others are charged £2

## Issues Found

**Document any problems:**
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]
- [ ] Issue 3: [Description]

## Next Steps

- [ ] Deploy to production
- [ ] Set up production cron job
- [ ] Monitor system performance
- [ ] Update documentation
- [ ] Train team on new system




