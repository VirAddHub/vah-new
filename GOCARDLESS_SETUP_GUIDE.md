# GoCardless Integration Setup Guide

## 🚀 Quick Start

Your GoCardless integration is now **ready to use**! Here's what's been implemented:

### ✅ What's Done

1. **Real GoCardless API Integration** - No SDK dependencies, pure HTTP calls
2. **Billing Request Flow (BRF)** - For both re-authorization and bank updates
3. **Webhook Handling** - Processes payments, mandates, and subscriptions
4. **Database Integration** - Tracks usage charges and invoices
5. **Frontend Billing Page** - Clean UI at `/billing`

### 🔧 Environment Variables

Add these to your `apps/backend/.env`:

```bash
# GoCardless Configuration
GC_ACCESS_TOKEN=your_sandbox_access_token_here  # pragma: allowlist secret
GC_ENVIRONMENT=sandbox
GC_WEBHOOK_SECRET=your_webhook_secret_here  # pragma: allowlist secret
APP_URL=https://your-frontend-domain.com
```

### 📋 GoCardless Sandbox Setup

1. **Sign up** at [GoCardless Sandbox](https://manage-sandbox.gocardless.com/)
2. **Get your credentials**:
   - Access Token: `Settings > API Access > Create Access Token`
   - Webhook Secret: `Settings > Webhooks > Create Webhook`  # pragma: allowlist secret
3. **Set webhook URL**: `https://your-backend-domain.com/api/webhooks/gocardless`

### 🧪 Testing

Run the test script:
```bash
node test-gocardless.js
```

### 🔄 How It Works

#### 1. User Clicks "Update Bank" or "Re-authorise"
- Frontend calls `/api/bff/billing/update-bank` or `/api/bff/billing/reauthorise`
- Backend creates Billing Request Flow via GoCardless API
- User gets redirected to GoCardless hosted page

#### 2. User Completes Authorization
- GoCardless redirects back to your app
- Backend processes the flow and gets mandate_id
- Subscription is updated with active mandate

#### 3. Forwarding Usage Tracking
- When admin marks forwarding as "Dispatched"
- System creates usage_charges record (£2 handling fee)
- Usage rolls into next month's invoice

#### 4. Webhook Processing
- GoCardless sends webhooks for payments, mandates, etc.
- Backend verifies signatures and updates database
- Invoices are created automatically

### 🎯 Key Features

- **No SDK Dependencies** - Pure HTTP calls for maximum compatibility
- **Sandbox Ready** - Easy testing with GoCardless sandbox
- **Production Ready** - Just switch to live credentials
- **Webhook Security** - HMAC signature verification
- **Error Handling** - Comprehensive error logging
- **Usage Tracking** - Automatic forwarding fee tracking

### 🚨 Important Notes

1. **Raw Body Parsing** - Ensure your Express server parses webhook body as raw text for signature verification
2. **HTTPS Required** - GoCardless webhooks require HTTPS in production
3. **User Metadata** - User IDs are passed in billing request metadata for webhook processing
4. **Error Logging** - All GoCardless API errors are logged for debugging

### 🔍 Debugging

Check logs for:
- `[GoCardless]` - API call errors
- `[GoCardless Webhook]` - Webhook processing
- `[postUpdateBank]` / `[postReauthorise]` - Controller errors

### 📞 Support

If you need help:
1. Check the test script output
2. Verify environment variables
3. Check GoCardless sandbox dashboard
4. Review server logs for errors

---

**Ready to go live?** Just switch `GC_ENVIRONMENT=live` and update your credentials! 🎉
