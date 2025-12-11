# Testing GoCardless Webhooks (Render Only)

**We do NOT test webhooks on localhost.**  
All webhook tests run against the Render backend.

## Prerequisites

1. Install GoCardless CLI:
   ```bash
   brew install gocardless/taps/cli
   ```

2. Login to GoCardless Sandbox:
   ```bash
   gc login
   ```

3. Ensure Render backend is deployed and healthy:
   - Check Render dashboard: Service is running
   - Verify environment variables are set:
     - `GOCARDLESS_WEBHOOK_SECRET` (matches sandbox webhook secret)
     - `GOCARDLESS_ACCESS_TOKEN` (sandbox access token)
     - `GOCARDLESS_ENV=sandbox`

## Webhook Endpoint

Your Render webhook URL:
```
https://vah-api-staging.onrender.com/api/webhooks-gc/gocardless
```

## Testing Steps

### 1. Start Webhook Listener

In your terminal, run:
```bash
gc listen --forward https://vah-api-staging.onrender.com/api/webhooks-gc/gocardless
```

You should see:
```
Started listening for new webhooks...
Forwarding to: https://vah-api-staging.onrender.com/api/webhooks-gc/gocardless
```

Keep this terminal open - it will forward all sandbox webhook events to your Render backend.

### 2. Trigger Test Events

In another terminal, trigger test events:

```bash
# List available events
gc help trigger

# Test payment confirmed (creates invoice)
gc trigger payment_confirmed

# Test mandate activation
gc trigger mandate_activated

# Test payment failure
gc trigger payment_failed

# Test subscription update
gc trigger subscription_updated
```

### 3. Check Render Logs

Go to Render Dashboard → Your Service → Logs

Look for:
```
[Webhook] ✅ Received 1 event(s) from GoCardless
[Webhook] 📨 Processing payments.confirmed { paymentId: 'PM123...', ... }
[Webhook] 💳 Processing payment confirmed: PM123...
[Webhook] ✅ Fetched payment details: 997p GBP
[Webhook] 👤 Found user 4 for payment PM123...
[Webhook] 📅 Billing period: 2025-01-01T00:00:00.000Z to 2025-01-31T23:59:59.999Z
[Webhook] ✅ Invoice created: VAH-2025-000001 (ID: 123) for user 4
[Webhook] 📄 PDF path: /invoices/2025/4/invoice-123.pdf
[Webhook] ✅ Payment PM123... confirmed and processed for user 4
```

### 4. Verify Invoice in Dashboard

Visit:
```
https://virtualaddresshub.co.uk/dashboard/billing
```

Or your staging frontend URL:
```
https://vah-new-frontend-75d6.vercel.app/dashboard/billing
```

You should see:
- New invoice row in the invoices table
- Invoice number (e.g., VAH-2025-000001)
- Status: "paid"
- Download PDF button works

### 5. Verify Database

Check your PostgreSQL database:
```sql
SELECT id, invoice_number, user_id, amount_pence, status, pdf_path, created_at
FROM invoices
ORDER BY created_at DESC
LIMIT 5;
```

You should see the newly created invoice.

## Troubleshooting

### Webhook Not Received

1. **Check Render service is running**
   - Go to Render Dashboard → Service status
   - Ensure service is "Live" and healthy

2. **Verify webhook URL**
   - Must be: `https://vah-api-staging.onrender.com/api/webhooks-gc/gocardless`
   - Check Render logs for route mounting confirmation

3. **Check signature verification**
   - Ensure `GOCARDLESS_WEBHOOK_SECRET` in Render matches your GoCardless sandbox webhook secret
   - Look for `[Webhook] ❌ Invalid signature` in logs

### Invoice Not Created

1. **Check user lookup**
   - Look for `[Webhook] ❌ Could not find user for payment` in logs
   - Verify payment is linked to a user via `subscription` table or payment metadata

2. **Check database connection**
   - Verify `DATABASE_URL` is set correctly in Render
   - Check for database connection errors in logs

3. **Check invoice creation errors**
   - Look for `[Webhook] ❌ Failed to create invoice` in logs
   - Verify `invoices` table exists and migrations are up to date

### Payment Not Linked to User

The webhook handler uses `findUserIdForPayment` which looks up users via:
- `subscription` table (by `mandate_id`)
- Payment metadata (if stored)

To test, ensure you have:
- A test user in your database
- A subscription record with `mandate_id` matching the GoCardless mandate
- Or payment metadata containing `user_id`

## Expected Log Patterns

### Success Flow:
```
[Webhook] ✅ Received 1 event(s) from GoCardless
[Webhook] 📨 Processing payments.confirmed
[Webhook] 💳 Processing payment confirmed: PMxxx
[Webhook] ✅ Fetched payment details: 997p GBP
[Webhook] 👤 Found user X for payment PMxxx
[Webhook] 📅 Billing period: ...
[Webhook] ✅ Invoice created: VAH-YYYY-XXXXXX (ID: X) for user X
[Webhook] 📄 PDF path: /invoices/YYYY/X/invoice-X.pdf
[Webhook] ✅ Payment PMxxx confirmed and processed for user X
```

### Error Patterns:
```
[Webhook] ❌ Invalid signature - rejecting webhook
[Webhook] ❌ Invalid webhook format - events array missing
[Webhook] ❌ No payment ID in links
[Webhook] ❌ Could not find user for payment PMxxx
[Webhook] ❌ Failed to create invoice for payment PMxxx: [error details]
```

## Production Checklist

Before going live:
- [ ] Test `payment_confirmed` webhook creates invoices
- [ ] Test `payment_failed` webhook updates subscription status
- [ ] Test `mandate_activated` webhook activates subscriptions
- [ ] Verify invoice PDFs are generated correctly
- [ ] Verify invoices appear in dashboard
- [ ] Test with real GoCardless sandbox payments (not just CLI triggers)
- [ ] Ensure `GOCARDLESS_WEBHOOK_SECRET` matches production webhook secret
- [ ] Switch `GOCARDLESS_ENV` from `sandbox` to `live` when ready

