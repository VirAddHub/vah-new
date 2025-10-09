# Render Cron Job Setup for Forwarding System

## Overview

This guide helps you set up a cron job on Render to automatically drain the forwarding outbox every 5 minutes.

## Step 1: Set Environment Variable

1. Go to your **Render Dashboard**
2. Navigate to your **Backend Service**
3. Go to **Environment** tab
4. Add new environment variable:
   - **Key**: `INTERNAL_CRON_TOKEN`
   - **Value**: Generate a long random string (e.g., `openssl rand -hex 32`)
5. **Save** the environment variable
6. **Redeploy** your service

## Step 2: Create Cron Job

1. In your **Render Dashboard**, go to **Cron Jobs**
2. Click **New Cron Job**
3. Fill in the details:

### Basic Configuration
- **Name**: `forwarding-drain`
- **Schedule**: `*/5 * * * *` (every 5 minutes)
- **Timezone**: `UTC` (or your preferred timezone)

### Command
```bash
curl -sS -X POST https://vah-api-staging.onrender.com/api/internal/forwarding/drain \
  -H "x-internal-cron-token: ${INTERNAL_CRON_TOKEN}"
```

### Environment
- **Environment**: Select your backend service environment
- **Environment Variables**: The cron job will inherit `INTERNAL_CRON_TOKEN` from your backend service

## Step 3: Test the Cron Job

### Manual Test
You can test the cron job manually by running the command in your backend service's shell:

```bash
# SSH into your backend service or use Render's shell
curl -sS -X POST https://vah-api-staging.onrender.com/api/internal/forwarding/drain \
  -H "x-internal-cron-token: $INTERNAL_CRON_TOKEN"
```

Expected response: `{"ok": true}`

### Verify Outbox Processing
Check your database to see if outbox events are being processed:

```sql
-- Check pending outbox events
SELECT id, status, attempt_count, last_error, created_at
FROM forwarding_outbox
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Check processed events
SELECT id, status, attempt_count, last_error, created_at
FROM forwarding_outbox
WHERE status = 'sent'
ORDER BY created_at DESC;
```

## Step 4: Monitor the Cron Job

### Render Dashboard
- Go to **Cron Jobs** → **forwarding-drain**
- Check **Logs** tab for execution history
- Look for successful runs and any errors

### Expected Logs
```
[Outbox] Processing forwarding.request.created for request 123
[Outbox] Processing forwarding.request.created for request 124
```

### Error Handling
If you see errors like:
```
[Outbox] Failed 123: Connection timeout
```

The system will automatically retry with exponential backoff:
- 1st attempt: Immediate
- 2nd attempt: 30 seconds later
- 3rd attempt: 2 minutes later
- 4th attempt: 10 minutes later
- After 4 attempts: Marked as `failed`

## Alternative: External Cron Service

If you prefer not to use Render's cron jobs, you can use any external cron service:

### Cron-job.org
1. Go to [cron-job.org](https://cron-job.org)
2. Create account and new cron job
3. **URL**: `https://vah-api-staging.onrender.com/api/internal/forwarding/drain`
4. **Method**: `POST`
5. **Headers**: `x-internal-cron-token: YOUR_TOKEN_HERE`
6. **Schedule**: Every 5 minutes

### GitHub Actions (if using GitHub)
Create `.github/workflows/forwarding-drain.yml`:

```yaml
name: Forwarding Outbox Drain
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  drain:
    runs-on: ubuntu-latest
    steps:
      - name: Drain Forwarding Outbox
        run: |
          curl -sS -X POST ${{ secrets.API_BASE_URL }}/api/internal/forwarding/drain \
            -H "x-internal-cron-token: ${{ secrets.INTERNAL_CRON_TOKEN }}"
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `INTERNAL_CRON_TOKEN` is set correctly
   - Verify the token matches between backend and cron job
   - Ensure the header name is exactly `x-internal-cron-token`

2. **Cron Job Not Running**
   - Check Render cron job logs
   - Verify the schedule syntax is correct
   - Ensure the service is deployed and running

3. **Outbox Events Not Processing**
   - Check if there are any pending events in the database
   - Verify the cron job is actually calling the endpoint
   - Check backend logs for errors

4. **High Retry Count**
   - Check if your backend service is overloaded
   - Verify database connectivity
   - Look for specific error messages in logs

### Debug Commands

```bash
# Check outbox status
psql $DATABASE_URL -c "
SELECT 
  status,
  COUNT(*) as count,
  MAX(attempt_count) as max_attempts
FROM forwarding_outbox 
GROUP BY status;
"

# Check recent errors
psql $DATABASE_URL -c "
SELECT id, status, attempt_count, last_error, created_at
FROM forwarding_outbox 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
"
```

## Security Notes

- Keep `INTERNAL_CRON_TOKEN` secret and rotate it periodically
- The endpoint is only accessible with the correct token
- Consider IP whitelisting if your cron service supports it
- Monitor for unusual activity in the outbox table

## Performance Considerations

- The outbox processes up to 25 events per run (configurable)
- Processing is idempotent - safe to run multiple times
- Failed events are retried with exponential backoff
- Consider increasing frequency during high-volume periods

This setup ensures your forwarding system processes events reliably without manual intervention.

