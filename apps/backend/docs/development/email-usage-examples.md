# Email Template Usage Examples

This document shows how to use the new standardized email system with real data from your application.

## 🎯 **New Standardized Approach**

Instead of manually building template models, use the `sendTemplateEmail` function with camelCase data:

```typescript
import { sendTemplateEmail } from '../lib/mailer';
import { Templates } from '../lib/postmark-templates';

// The template builder automatically converts camelCase → snake_case
await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.Welcome,
  model: {
    firstName: user.first_name,        // → first_name
    dashboardUrl: `${APP_URL}/dashboard`, // → dashboard_link
  },
});
```

## 📧 **Real Usage Examples**

### 1. **After User Signup (Welcome Email)**

```typescript
// In your signup route
await sendTemplateEmail({
  to: newUser.email,
  templateAlias: Templates.Welcome,
  model: {
    firstName: newUser.first_name,
    dashboardUrl: `${ENV.APP_BASE_URL}/dashboard`,
  },
});
```

### 2. **Password Reset Request**

```typescript
// In your password reset route
const resetToken = generateSecureToken();
const resetLink = `${ENV.APP_BASE_URL}/reset?token=${resetToken}`;

await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.PasswordReset,
  model: {
    firstName: user.first_name,
    resetLink: resetLink,
    expiryMinutes: 60,
  },
});
```

### 3. **KYC Approved (with Virtual Address)**

```typescript
// In your KYC approval webhook/process
await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.KycApproved,
  model: {
    firstName: user.first_name,
    virtualAddressLine1: address.line1,
    virtualAddressLine2: address.line2,
    postcode: address.postcode,
    dashboardUrl: `${ENV.APP_BASE_URL}/dashboard`,
  },
});
```

### 4. **Invoice Sent (Billing)**

```typescript
// In your billing system
await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.InvoiceSent,
  model: {
    name: user.full_name,
    invoiceNumber: invoice.number,
    amount: `£${invoice.amount}`,
    billingUrl: `${ENV.APP_BASE_URL}/billing`,
  },
});
```

### 5. **Mail Forwarded (Physical Mail)**

```typescript
// In your mail processing system
await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.MailForwarded,
  model: {
    name: user.first_name,
    trackingNumber: mailItem.tracking_number,
    carrier: mailItem.carrier,
    ctaUrl: `${ENV.APP_BASE_URL}/mail`,
  },
});
```

### 6. **Support Request Received**

```typescript
// In your support system
await sendTemplateEmail({
  to: user.email,
  templateAlias: Templates.SupportRequestReceived,
  model: {
    name: user.first_name,
    ticketId: supportTicket.id,
    ctaUrl: `${ENV.APP_BASE_URL}/support/${supportTicket.id}`,
  },
});
```

## 🔄 **Migration from Old System**

### Before (Manual Template Models):
```typescript
await sendWithTemplate(Templates.Welcome, email, {
  name: user.first_name,
  cta_url: `${APP_URL}/dashboard`,
  subject: 'Welcome!',
});
```

### After (Standardized Builder):
```typescript
await sendTemplateEmail({
  to: email,
  templateAlias: Templates.Welcome,
  model: {
    firstName: user.first_name,        // Auto-converts to first_name
    dashboardUrl: `${APP_URL}/dashboard`, // Auto-converts to dashboard_link
  },
});
```

## 🎨 **Template Variable Mapping**

| Your Code (camelCase) | Postmark Template (snake_case) | Example |
|----------------------|-------------------------------|---------|
| `firstName` | `first_name` | "John" |
| `dashboardUrl` | `dashboard_link` | "https://app.com/dashboard" |
| `resetLink` | `reset_link` | "https://app.com/reset?token=abc" |
| `invoiceNumber` | `invoice_number` | "INV-123456" |
| `trackingNumber` | `tracking_number` | "TRK123456789" |
| `virtualAddressLine1` | `virtual_address_line_1` | "123 Business Street" |
| `ticketId` | `ticket_id` | "SR-2025-001" |

## 🧪 **Testing with Real Data**

Use the debug route to test with real data:

```bash
curl -X POST https://vah-api-staging.onrender.com/api/debug-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kyc-approved",
    "email": "test@example.com",
    "name": "John Doe",
    "virtualAddressLine1": "123 Business Street",
    "virtualAddressLine2": "Suite 100",
    "postcode": "SW1A 1AA",
    "cta_url": "https://vah-new-frontend-75d6.vercel.app/profile"
  }'
```

## 🚀 **Benefits**

1. **Consistent**: All emails use the same data format
2. **Type-safe**: TypeScript catches variable name mismatches
3. **Maintainable**: Change template variables in one place
4. **Flexible**: Easy to add new template variables
5. **Testable**: Clear separation between data and templates

## 🔧 **Adding New Templates**

1. Add the template alias to `postmark-templates.ts`
2. Add a model builder to `template-models.ts`
3. Create a wrapper function in `mailer.ts`
4. Update this documentation with usage examples
