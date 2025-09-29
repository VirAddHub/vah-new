# Email System – Operations Guide (Prod-Ready)

## Current topology

* **Frontend (APP_BASE_URL):** `https://vah-new-frontend-75d6.vercel.app`
* **Backend (API base):** `https://vah-api-staging.onrender.com`

All email CTA links will point to the **frontend**. Postmark webhooks will POST to the **backend**.

## Environment Variables (set in **Render → Backend**)

```bash
# --- App / URLs
APP_BASE_URL=https://vah-new-frontend-75d6.vercel.app

# --- Postmark (DO NOT COMMIT)
POSTMARK_TOKEN=<server_token_from_postmark_dashboard>
POSTMARK_FROM=hello@virtualaddresshub.co.uk
POSTMARK_FROM_NAME=VirtualAddressHub
POSTMARK_REPLY_TO=support@virtualaddresshub.co.uk
POSTMARK_STREAM=outbound

# --- Webhook basic auth (YOUR random credentials to protect the webhook)
POSTMARK_WEBHOOK_USER=<your_random_username>  # pragma: allowlist secret
POSTMARK_WEBHOOK_PASS=<your_random_password>  # pragma: allowlist secret

# --- Feature flags (1=on, 0=off)
EMAIL_ONBOARDING=1
EMAIL_BILLING=1
EMAIL_KYC=1
EMAIL_MAIL=1
EMAIL_SUPPORT=1
EMAIL_SECURITY=1
```

> ✅ **Secrets live only in Render/Vercel env dashboards.** Never commit them to Git.

## Postmark templates (aliases + variables)

Create **exact** aliases in Postmark:

1. `billing-reminder`

   * **Subject:** `Action required: complete your payment`
   * **CTA:** `${APP_BASE_URL}/billing#payment`
   * **Variables:** `name`, `action_url`

2. `kyc-reminder`

   * **Subject:** `Please complete KYC`
   * **CTA:** `${APP_BASE_URL}/profile`
   * **Variables:** `name`, `action_url`

3. `mail-received`

   * **Subject:** `You've got mail`
   * **CTA:** `${APP_BASE_URL}/mail`
   * **Variables:** `name`, `preview`, `action_url`

> If a template is missing, the system sends a built-in **HTML fallback** automatically.

## Webhook (Postmark → Backend)

* **URL:** `POST https://vah-api-staging.onrender.com/api/webhooks-postmark`
* **Auth:** Basic (if configured)

  * Username: `POSTMARK_WEBHOOK_USER`  # pragma: allowlist secret
  * Password: `POSTMARK_WEBHOOK_PASS`  # pragma: allowlist secret
* **Expected response:** `204 No Content`

### Basic Auth Setup (Your Random Credentials)

**These are YOUR random username/password** (not Postmark's account credentials):

1. **Pick any random values** (e.g. `POSTMARK_WEBHOOK_USER=s71c3x` and `POSTMARK_WEBHOOK_PASS=zW_9pN7q8R`)
2. **Set them in Render environment variables**
3. **Configure Postmark webhook** to use the same credentials
4. **Test with curl:**
   ```bash
   # Should succeed (204) with correct creds
   curl -i -u s71c3x:zW_9pN7q8R \
     -H "Content-Type: application/json" \
     -d '{"MessageStream":"outbound","RecordType":"Open"}' \
     https://vah-api-staging.onrender.com/api/webhooks-postmark
   
   # Should fail (401) with wrong creds
   curl -i -u wrong:wrong https://vah-api-staging.onrender.com/api/webhooks-postmark
   ```

**Why?** Your webhook URL is public. Basic Auth stops random traffic from spamming it.

> ✅ **Already implemented:** The webhook route automatically checks Basic Auth when `POSTMARK_WEBHOOK_USER` and `POSTMARK_WEBHOOK_PASS` are set. If not set, auth is disabled (useful for local development).

## CTA conventions (used across templates)

* Invoice: `/billing#invoices`
* Payment method: `/billing#payment`
* Plan: `/billing#plan`
* Profile / Security: `/profile#security`
* Profile / KYC: `/profile`
* Dashboard: `/dashboard`
* Mail inbox: `/mail`
* Forwarding: `/forwarding`
* Support: `/support`

## Health & verification

**Backend health**

```bash
curl -i https://vah-api-staging.onrender.com/api/healthz   # -> {"ok":true}
curl -i https://vah-api-staging.onrender.com/api/__version # build/commit info
```

**Webhook smoke test**

```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  --data-binary '{"MessageStream":"outbound","RecordType":"Open","MessageID":"ops-test","Recipient":"test@example.com"}' \
  https://vah-api-staging.onrender.com/api/webhooks-postmark
# -> 204 No Content
```

## Feature flags (safe rollout)

* Toggle any email type independently using the `EMAIL_*` flags above.
* When a flag is off, the corresponding function is a **no-op** (no send, no crash).

## Troubleshooting

**Emails not sending**

1. `POSTMARK_TOKEN` set in Render?
2. `EMAIL_*` flag = `1`?
3. Template alias names match exactly?
4. Check Postmark Activity for send/delivery status.

**Webhook issues**

1. Postmark webhook URL matches the backend URL above.
2. Basic auth creds match Render envs.
3. Backend returns `204`.
4. See backend logs for `[postmark-webhook]` entries.

**Fallback behavior**

* Missing templates → HTML fallback is sent.
* Missing Postmark token → functions return early (no-op), app stays up.
* Errors are logged; they don't crash the server.

## Migration later (custom domain)

When you switch the frontend to your custom domain, update **one** var:

```
APP_BASE_URL=https://virtualaddresshub.co.uk
```

Everything else (templates, flags, webhook) can remain unchanged unless you also move the backend URL.

## Email Functions Reference

| Alias | Function | Required fields | Optional fields |
|-------|----------|----------------|-----------------|
| `password-reset-email` | `sendPasswordResetEmail` | `email`, `cta_url` | `name` |
| `password-changed-confirmation` | `sendPasswordChangedConfirmation` | `email` | `name` |
| `welcome-email` | `sendWelcomeEmail` | `email`, `cta_url` | `name` |
| `plan-cancelled` | `sendPlanCancelled` | `email` | `name`, `end_date`, `cta_url` |
| `invoice-sent` | `sendInvoiceSent` | `email` | `name`, `invoice_number`, `amount`, `cta_url` |
| `payment-failed` | `sendPaymentFailed` | `email`, `cta_url` | `name` |
| `kyc-submitted` | `sendKycSubmitted` | `email` | `name`, `cta_url` |
| `kyc-approved` | `sendKycApproved` | `email` | `name`, `cta_url` |
| `kyc-rejected` | `sendKycRejected` | `email` | `name`, `reason`, `cta_url` |
| `support-request-received` | `sendSupportRequestReceived` | `email` | `name`, `ticket_id`, `cta_url` |
| `support-request-closed` | `sendSupportRequestClosed` | `email` | `name`, `ticket_id`, `cta_url` |
| `mail-scanned` | `sendMailScanned` | `email` | `name`, `subject`, `cta_url` |
| `mail-forwarded` | `sendMailForwarded` | `email` | `name`, `tracking_number`, `carrier`, `cta_url` |
| `mail-received-after-cancellation` | `sendMailReceivedAfterCancellation` | `email` | `name`, `subject`, `cta_url` |

> **Note:** See Postmark template for exact variables. Fields can be adjusted per template content.

## Debug endpoint (optional)

**Safe test email trigger** (guarded by env flags):

```bash
# Enable debug emails in Render env:
DEBUG_EMAIL_ENABLED=1
DEBUG_EMAIL_ALLOWED_IPS=your.ip.address,another.ip  # optional IP allowlist

# Test password reset
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"password-reset","email":"test@example.com","name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/reset?token=abc123"}'

# Test welcome email
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"welcome","email":"test@example.com","name":"Test User","cta_url":"https://vah-new-frontend-75d6.vercel.app/dashboard"}'

# Test invoice sent
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice-sent","email":"test@example.com","name":"Test User","invoice_number":"INV-123","amount":"£29.99"}'

# Test KYC rejected
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"kyc-rejected","email":"test@example.com","name":"Test User","reason":"Document quality insufficient"}'

# Test support request received
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"support-received","email":"test@example.com","name":"Test User","ticket_id":"TICKET-456"}'

# Test mail forwarded
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"mail-forwarded","email":"test@example.com","name":"Test User","tracking_number":"TRK123456","carrier":"Royal Mail"}'
```

**Response:** Returns environment info and CTA URLs for verification.

> 🔒 **Security:** Debug endpoint is disabled by default. Enable only when needed for testing.