# Email Template Variables Reference

This document shows all the variables/placeholders used in each email template.

## Template Variable Mapping

### 1. Password Reset Email (`password-reset-email`)
**Template Variables:**
- `{{first_name}}` - User's first name
- `{{reset_link}}` - Password reset URL with token
- `{{expiry_minutes}}` - Link expiration time

**Code Variables:**
```typescript
{
  name: string,           // Maps to {{first_name}}
  cta_url: string,       // Maps to {{reset_link}}
  subject: string        // Email subject
}
```

### 2. Password Changed Confirmation (`password-changed-confirmation`)
**Template Variables:**
- `{{first_name}}` - User's first name

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{first_name}}
  subject: string        // Email subject
}
```

### 3. Welcome Email (`welcome-email`)
**Template Variables:**
- `{{first_name}}` - User's first name
- `{{dashboard_link}}` - Link to user dashboard

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{first_name}}
  cta_url: string,      // Maps to {{dashboard_link}}
  subject: string       // Email subject
}
```

### 4. Plan Cancelled (`plan-cancelled`)
**Template Variables:**
- `{{name}}` - User's name
- `{{end_date}}` - Plan end date
- `{{cta_url}}` - Link to billing page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  end_date?: string,     // Maps to {{end_date}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 5. Invoice Sent (`invoice-sent`)
**Template Variables:**
- `{{name}}` - User's name
- `{{invoice_number}}` - Invoice number
- `{{amount}}` - Invoice amount
- `{{cta_url}}` - Link to billing page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  invoice_number?: string, // Maps to {{invoice_number}}
  amount?: string,       // Maps to {{amount}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 6. Payment Failed (`payment-failed`)
**Template Variables:**
- `{{name}}` - User's name
- `{{cta_url}}` - Link to payment page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  cta_url: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 7. KYC Submitted (`kyc-submitted`)
**Template Variables:**
- `{{name}}` - User's name
- `{{cta_url}}` - Link to profile page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 8. KYC Approved (`kyc-approved`)
**Template Variables:**
- `{{first_name}}` - User's first name
- `{{virtual_address_line_1}}` - First line of virtual address
- `{{virtual_address_line_2}}` - Second line of virtual address
- `{{postcode}}` - Postcode
- `{{dashboard_link}}` - Link to dashboard

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{first_name}}
  cta_url?: string,      // Maps to {{dashboard_link}}
  subject: string        // Email subject
}
```

### 9. KYC Rejected (`kyc-rejected`)
**Template Variables:**
- `{{name}}` - User's name
- `{{reason}}` - Rejection reason
- `{{cta_url}}` - Link to profile page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  reason?: string,       // Maps to {{reason}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 10. Support Request Received (`support-request-received`)
**Template Variables:**
- `{{name}}` - User's name
- `{{ticket_id}}` - Support ticket ID
- `{{cta_url}}` - Link to support page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  ticket_id?: string,    // Maps to {{ticket_id}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 11. Support Request Closed (`support-request-closed`)
**Template Variables:**
- `{{name}}` - User's name
- `{{ticket_id}}` - Support ticket ID
- `{{cta_url}}` - Link to support page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  ticket_id?: string,    // Maps to {{ticket_id}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 12. Mail Scanned (`mail-scanned`)
**Template Variables:**
- `{{name}}` - User's name
- `{{subject}}` - Mail subject
- `{{cta_url}}` - Link to mail page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  subject?: string,      // Maps to {{subject}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 13. Mail Forwarded (`mail-forwarded`)
**Template Variables:**
- `{{name}}` - User's name
- `{{tracking_number}}` - Tracking number
- `{{carrier}}` - Shipping carrier
- `{{cta_url}}` - Link to mail page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  tracking_number?: string, // Maps to {{tracking_number}}
  carrier?: string,      // Maps to {{carrier}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

### 14. Mail Received After Cancellation (`mail-received-after-cancellation`)
**Template Variables:**
- `{{name}}` - User's name
- `{{subject}}` - Mail subject
- `{{cta_url}}` - Link to mail page

**Code Variables:**
```typescript
{
  name: string,          // Maps to {{name}}
  subject?: string,      // Maps to {{subject}}
  cta_url?: string,      // Maps to {{cta_url}}
  subject: string        // Email subject
}
```

## Variable Naming Conventions

### Template Variables (in Postmark)
- Use `{{variable_name}}` format
- Use descriptive names: `{{first_name}}`, `{{dashboard_link}}`
- Use snake_case: `{{virtual_address_line_1}}`

### Code Variables (in TypeScript)
- Use camelCase: `firstName`, `dashboardLink`
- Use descriptive names: `name`, `cta_url`
- Match template variables where possible

## Missing Variables

Some templates expect variables that aren't currently being sent:

1. **KYC Approved** needs:
   - `{{virtual_address_line_1}}`
   - `{{virtual_address_line_2}}`
   - `{{postcode}}`

2. **Password Reset** needs:
   - `{{expiry_minutes}}`

3. **Welcome Email** uses `{{first_name}}` but code sends `name`

## Recommendations

1. **Update template variables** to match what your code sends
2. **Add missing variables** to your code functions
3. **Standardize naming** between templates and code
4. **Test all variables** with the debug route

## Testing Variables

Use the debug route to test variable mapping:

```bash
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kyc-approved",
    "email": "test@example.com",
    "name": "John Doe",
    "cta_url": "https://vah-new-frontend-75d6.vercel.app/profile"
  }'
```
