# 📧 Complete Email Template Inventory

## **Active Templates in Code (`server/index.js`)**

### 1. **password-changed-confirmation**
**Purpose:** Password change confirmation  
**Current Usage:** `await sendTemplateEmail('password-changed-confirmation', user.email, { first_name, security_tips_url })`  
**Suggested CTA:** `/profile#security` or `/profile`

### 2. **welcome-email**
**Purpose:** New user signup welcome  
**Current Usage:** `await sendTemplateEmail('welcome-email', user.email, { first_name, dashboard_url })`  
**Suggested CTA:** `/dashboard`

### 3. **plan-cancelled**
**Purpose:** Subscription cancellation notification  
**Current Usage:** `await sendTemplateEmail('plan-cancelled', me.email, { first_name, reactivate_url })`  
**Suggested CTA:** `/billing#plan`

### 4. **kyc-submitted**
**Purpose:** KYC verification submitted  
**Current Usage:** `await sendTemplateEmail('kyc-submitted', u.email, { first_name, help_url })`  
**Suggested CTA:** `/profile` or `/help`

### 5. **support-request-received**
**Purpose:** Support ticket created  
**Current Usage:** `await sendTemplateEmail('support-request-received', u.email, { first_name, ticket_id })`  
**Suggested CTA:** `/support` or `/help`

### 6. **support-request-closed**
**Purpose:** Support ticket closed  
**Current Usage:** `await sendTemplateEmail('support-request-closed', row.email, { first_name, ticket_id })`  
**Suggested CTA:** `/support` or `/dashboard`

### 7. **kyc-approved**
**Purpose:** KYC verification approved  
**Current Usage:** `await sendTemplateEmail('kyc-approved', u.email, { first_name, dashboard_url })`  
**Suggested CTA:** `/dashboard` or `/profile`

### 8. **kyc-rejected**
**Purpose:** KYC verification rejected  
**Current Usage:** `await sendTemplateEmail('kyc-rejected', u.email, { first_name, reason })`  
**Suggested CTA:** `/profile` or `/help`

### 9. **mail-received-after-cancellation**
**Purpose:** Mail received after plan cancelled  
**Current Usage:** `await sendTemplateEmail('mail-received-after-cancellation', owner.email, { first_name, subject })`  
**Suggested CTA:** `/billing#plan` (to reactivate)

### 10. **mail-scanned**
**Purpose:** Mail item scanned notification  
**Current Usage:** `await sendTemplateEmail('mail-scanned', owner.email, { first_name, subject })`  
**Suggested CTA:** `/mail` or `/mail/{id}`

### 11. **mail-forwarded**
**Purpose:** Mail forwarding confirmation  
**Current Usage:** `await sendTemplateEmail('mail-forwarded', owner.email, { first_name, subject, tracking_url })`  
**Suggested CTA:** `/forwarding` or tracking URL

### 12. **invoice-sent**
**Purpose:** Invoice sent notification  
**Current Usage:** `await sendTemplateEmail('invoice-sent', u.email, { first_name, invoice_url })`  
**Suggested CTA:** `/billing#invoices`

### 13. **payment-failed**
**Purpose:** Payment failure notification  
**Current Usage:** `await sendTemplateEmail('payment-failed', u.email, { first_name, fix_url })`  
**Suggested CTA:** `/billing#payment`

---

## **Template Examples in Documentation (`docs/POSTMARK_TEMPLATES.md`)**

### 1. **billing-reminder**
**Purpose:** Billing update reminder  
**Suggested CTA:** `/billing#payment`

### 2. **payment-failed** (duplicate)
**Purpose:** Payment failure notification  
**Suggested CTA:** `/billing`

### 3. **kyc-reminder**
**Purpose:** KYC verification reminder  
**Suggested CTA:** `/profile`

### 4. **welcome-email** (duplicate)
**Purpose:** Welcome email  
**Suggested CTA:** `/dashboard`

### 5. **mail-received**
**Purpose:** New mail received notification  
**Suggested CTA:** `/mail` or `/mail/{id}`

---

## **Template Status Summary**

### ✅ **Templates with CTA Support**
- All templates in `docs/POSTMARK_TEMPLATES.md` are designed with `{{cta_url}}` support
- The `sendTemplateEmail()` function automatically injects `cta_url` based on `cta_path` or `cta_url` in the model

### ⚠️ **Templates Missing CTA Integration**
Most templates in `server/index.js` don't currently use `cta_path` or `cta_url` in their model. They use hardcoded URLs like `${APP_URL}/billing` instead of dynamic CTAs.

### 🔄 **Duplicate Templates**
- `welcome-email` appears in both code and documentation
- `payment-failed` appears in both code and documentation

---

## **Recommended CTA Paths for Each Template**

| Template | Current URL | Suggested CTA Path | Purpose |
|----------|-------------|-------------------|---------|
| `password-changed-confirmation` | `${APP_URL}/security` | `/profile#security` | Security settings |
| `welcome-email` | `${APP_URL}` | `/dashboard` | Main dashboard |
| `plan-cancelled` | `${APP_URL}/billing` | `/billing#plan` | Plan management |
| `kyc-submitted` | `${APP_URL}/kyc` | `/profile` | Profile/KYC page |
| `support-request-received` | N/A | `/support` | Support page |
| `support-request-closed` | N/A | `/support` | Support page |
| `kyc-approved` | `${APP_URL}` | `/dashboard` | Main dashboard |
| `kyc-rejected` | N/A | `/profile` | Profile page |
| `mail-received-after-cancellation` | N/A | `/billing#plan` | Reactivate plan |
| `mail-scanned` | N/A | `/mail` | Mail inbox |
| `mail-forwarded` | Tracking URL | `/forwarding` | Forwarding page |
| `invoice-sent` | `${APP_URL}/billing` | `/billing#invoices` | Invoice history |
| `payment-failed` | `${APP_URL}/billing` | `/billing#payment` | Payment method |

---

## **Next Steps**

1. **Update existing templates** to use `cta_path` instead of hardcoded URLs
2. **Consolidate duplicates** between code and documentation
3. **Add missing templates** from documentation to your Postmark account
4. **Standardize naming** across all templates
5. **Test all CTAs** to ensure they work with the deep linking system

---

## **Template Variables Reference**

### Common Variables
- `{{first_name}}` - User's first name
- `{{name}}` - User's display name
- `{{cta_url}}` - Generated CTA URL (auto-injected)
- `{{action_url}}` - Same as cta_url (for compatibility)

### Template-Specific Variables
- `{{ticket_id}}` - Support ticket ID
- `{{subject}}` - Mail subject
- `{{reason}}` - KYC rejection reason
- `{{tracking_url}}` - Mail tracking URL
- `{{invoice_url}}` - Invoice URL
- `{{security_tips_url}}` - Security tips URL
- `{{help_url}}` - Help page URL
- `{{reactivate_url}}` - Plan reactivation URL
- `{{fix_url}}` - Payment fix URL
- `{{dashboard_url}}` - Dashboard URL

---

*Last updated: September 11, 2025*
