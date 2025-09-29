# Email System Operations Guide

## Overview

Production-ready email notification system with Postmark integration, feature flags, and graceful fallbacks.

## Current Setup (Vercel + Render)

**Frontend**: `https://vah-new-frontend-75d6.vercel.app` (Vercel)  
**Backend**: `https://vah-api-staging.onrender.com` (Render)  
**Email CTAs**: Point to Vercel frontend URLs

### When Switching to Custom Domain
Change only `APP_BASE_URL` to `https://virtualaddresshub.co.uk` - everything else stays the same.

## Environment Variables

### Required (Current Vercel Setup)
```bash
# --- App / URLs
APP_BASE_URL=https://vah-new-frontend-75d6.vercel.app

# --- Postmark
POSTMARK_TOKEN=your_postmark_server_token  # pragma: allowlist secret
POSTMARK_FROM=hello@virtualaddresshub.co.uk
POSTMARK_FROM_NAME=VirtualAddressHub
POSTMARK_REPLY_TO=support@virtualaddresshub.co.uk
POSTMARK_STREAM=outbound

# --- Webhook basic auth (optional)
POSTMARK_WEBHOOK_USER=your_webhook_user  # pragma: allowlist secret
POSTMARK_WEBHOOK_PASS=your_webhook_pass  # pragma: allowlist secret

# --- Feature flags (1=on, 0=off)
EMAIL_ONBOARDING=1
EMAIL_BILLING=1
EMAIL_KYC=1
EMAIL_MAIL=1
EMAIL_SUPPORT=1
EMAIL_SECURITY=1
```

## Postmark Templates

Create these templates with **exact aliases**:

### 1. `billing-reminder`
- **CTA Target**: `${APP_BASE_URL}/billing#payment`
- **Template Variables**: `name`, `action_url`
- **Subject**: "Action required: complete your payment"

### 2. `kyc-reminder`
- **CTA Target**: `${APP_BASE_URL}/profile`
- **Template Variables**: `name`, `action_url`
- **Subject**: "Please complete KYC"

### 3. `mail-received`
- **CTA Target**: `${APP_BASE_URL}/mail`
- **Template Variables**: `name`, `preview`, `action_url`
- **Subject**: "You have got mail"

## Webhook Configuration

**Endpoint**: `POST https://vah-api-staging.onrender.com/api/webhooks-postmark`

**Authentication**: Basic Auth (if configured)
- Username: `POSTMARK_WEBHOOK_USER`  # pragma: allowlist secret
- Password: `POSTMARK_WEBHOOK_PASS`  # pragma: allowlist secret

**Expected Response**: `204 No Content`

## API Usage

### Send Billing Reminder
```typescript
import { sendBillingReminder } from './lib/mailer';

await sendBillingReminder({ 
  email: 'user@example.com', 
  name: 'John Doe' 
});
```

### Send KYC Reminder
```typescript
import { sendKycReminder } from './lib/mailer';

await sendKycReminder({ 
  email: 'user@example.com', 
  name: 'John Doe' 
});
```

### Send Mail Received Notification
```typescript
import { sendMailReceived } from './lib/mailer';

await sendMailReceived({ 
  email: 'user@example.com', 
  name: 'John Doe',
  preview: 'New message from Jane Smith...'
});
```

## Feature Flags

Each email type can be independently enabled/disabled:

- `EMAIL_BILLING=1` - Enable billing reminders
- `EMAIL_KYC=1` - Enable KYC reminders  
- `EMAIL_MAIL=1` - Enable mail notifications
- `EMAIL_ONBOARDING=1` - Enable onboarding emails
- `EMAIL_SUPPORT=1` - Enable support emails
- `EMAIL_SECURITY=1` - Enable security emails

**Safe Deployment**: Set flags to `0` or unset to disable without code changes.

## Health Checks

### API Health
```bash
curl -i https://vah-api-staging.onrender.com/api/healthz
# Expected: {"ok":true}
```

### Version Check
```bash
curl -i https://vah-api-staging.onrender.com/api/__version
# Expected: Build info with commit hash
```

### Webhook Test
```bash
curl -i -X POST -H "Content-Type: application/json" \
  --data-binary '{"MessageStream":"outbound","RecordType":"Open","MessageID":"test-123","Recipient":"test@example.com"}' \
  https://vah-api-staging.onrender.com/api/webhooks-postmark
# Expected: 204 No Content
```

## Troubleshooting

### Emails Not Sending
1. Check `POSTMARK_TOKEN` is set in Vercel
2. Verify feature flags are set to `1`
3. Confirm template aliases match exactly
4. Check Postmark dashboard for delivery status

### Webhook Issues
1. Verify webhook URL is correct
2. Check basic auth credentials if configured
3. Review webhook logs in Postmark dashboard
4. Test with curl command above

### Fallback Behavior
- If templates are missing, system sends HTML fallback
- If Postmark token is missing, functions return early (no-op)
- All errors are logged but don't crash the application

## Development

### Local Testing
```bash
# Set minimal env vars for testing
export POSTMARK_TOKEN=""
export EMAIL_BILLING=1
export EMAIL_KYC=1
export EMAIL_MAIL=1

# Run tests
npm test -- tests/unit/mailer.templates.spec.ts
```

### Production Testing
```bash
# Test billing reminder
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"billing","email":"test@example.com","name":"Test User"}'

# Test KYC reminder
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"kyc","email":"test@example.com","name":"Test User"}'

# Test mail received notification
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"mail","email":"test@example.com","name":"Test User","preview":"New message from John..."}'
```

**Response**: Returns environment info and CTA URLs for verification.

## Security

- All environment variables are kept in Vercel (not in Git)
- Webhook endpoint has basic auth protection
- Email functions are feature-flagged for safe deployment
- No sensitive data is logged in production

## Monitoring

- Check Postmark dashboard for delivery rates
- Monitor webhook endpoint for 204 responses
- Watch application logs for email function calls
- Set up alerts for webhook failures
