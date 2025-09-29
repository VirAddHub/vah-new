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

# --- Webhook basic auth (optional but recommended)
POSTMARK_WEBHOOK_USER=<random_username>
POSTMARK_WEBHOOK_PASS=<random_password>

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

## Debug endpoint (optional)

**Safe test email trigger** (guarded by env flags):

```bash
# Enable debug emails in Render env:
DEBUG_EMAIL_ENABLED=1
DEBUG_EMAIL_ALLOWED_IPS=your.ip.address,another.ip  # optional IP allowlist

# Test billing reminder
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"billing","email":"test@example.com","name":"Test User"}'

# Test KYC reminder
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"kyc","email":"test@example.com","name":"Test User"}'

# Test mail received
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{"type":"mail","email":"test@example.com","name":"Test User","preview":"New message..."}'
```

**Response:** Returns environment info and CTA URLs for verification.

> 🔒 **Security:** Debug endpoint is disabled by default. Enable only when needed for testing.