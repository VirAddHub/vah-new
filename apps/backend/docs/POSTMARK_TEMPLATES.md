# Postmark Email Templates

Ready-to-paste templates for VirtualAddressHub. All templates use `{{cta_url}}` which is automatically injected by `sendTemplateEmail()`.

## Billing Reminder

```json
{
  "Alias": "billing-reminder",
  "Subject": "Action needed: update your billing details",
  "TemplateType": "Standard",
  "Name": "Billing reminder",
  "HtmlBody": "<p>Hi {{name}},</p><p>Your payment method needs an update.</p><p><a href=\"{{cta_url}}\" style=\"display:inline-block;padding:12px 16px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none;\">Manage billing</a></p><p>If the button doesn't work, paste this into your browser: {{cta_url}}</p>",
  "TextBody": "Hi {{name}},\n\nYour payment method needs an update.\n\nManage billing: {{cta_url}}\n",
  "TemplateModel": {
    "name": "there",
    "cta_url": "https://example"
  }
}
```

**Send call:**
```js
await sendTemplateEmail(user.email, 'billing-reminder', {
  name: user.first_name || user.email,
  cta_path: '/billing#payment'
});
```

## Failed Payment

```json
{
  "Alias": "payment-failed",
  "Subject": "Payment failed - update your billing details",
  "TemplateType": "Standard",
  "Name": "Failed payment",
  "HtmlBody": "<p>Hi {{name}},</p><p>We couldn't process your payment. Please update your billing details to continue service.</p><p><a href=\"{{cta_url}}\" style=\"display:inline-block;padding:12px 16px;border-radius:8px;background:#dc2626;color:#fff;text-decoration:none;\">Fix payment</a></p><p>If the button doesn't work, paste this into your browser: {{cta_url}}</p>",
  "TextBody": "Hi {{name}},\n\nWe couldn't process your payment. Please update your billing details to continue service.\n\nFix payment: {{cta_url}}\n",
  "TemplateModel": {
    "name": "there",
    "cta_url": "https://example"
  }
}
```

**Send call:**
```js
await sendTemplateEmail(user.email, 'payment-failed', {
  name: user.first_name || user.email,
  cta_path: '/billing'
});
```

## KYC Reminder

```json
{
  "Alias": "kyc-reminder",
  "Subject": "Complete your identity verification",
  "TemplateType": "Standard",
  "Name": "KYC reminder",
  "HtmlBody": "<p>Hi {{name}},</p><p>To access all features including certificate downloads and mail forwarding, please complete your identity verification.</p><p><a href=\"{{cta_url}}\" style=\"display:inline-block;padding:12px 16px;border-radius:8px;background:#7c3aed;color:#fff;text-decoration:none;\">Complete verification</a></p><p>If the button doesn't work, paste this into your browser: {{cta_url}}</p>",
  "TextBody": "Hi {{name}},\n\nTo access all features including certificate downloads and mail forwarding, please complete your identity verification.\n\nComplete verification: {{cta_url}}\n",
  "TemplateModel": {
    "name": "there",
    "cta_url": "https://example"
  }
}
```

**Send call:**
```js
await sendTemplateEmail(user.email, 'kyc-reminder', {
  name: user.first_name || user.email,
  cta_path: '/profile'
});
```

## Welcome Email

```json
{
  "Alias": "welcome-email",
  "Subject": "Welcome to VirtualAddressHub!",
  "TemplateType": "Standard",
  "Name": "Welcome",
  "HtmlBody": "<p>Hi {{name}},</p><p>Welcome to VirtualAddressHub! Your virtual address is ready.</p><p><a href=\"{{cta_url}}\" style=\"display:inline-block;padding:12px 16px;border-radius:8px;background:#059669;color:#fff;text-decoration:none;\">Go to dashboard</a></p><p>If the button doesn't work, paste this into your browser: {{cta_url}}</p>",
  "TextBody": "Hi {{name}},\n\nWelcome to VirtualAddressHub! Your virtual address is ready.\n\nGo to dashboard: {{cta_url}}\n",
  "TemplateModel": {
    "name": "there",
    "cta_url": "https://example"
  }
}
```

**Send call:**
```js
await sendTemplateEmail(user.email, 'welcome-email', {
  name: user.first_name || user.email,
  cta_path: '/dashboard'
});
```

## Mail Received

```json
{
  "Alias": "mail-received",
  "Subject": "New mail received - {{subject}}",
  "TemplateType": "Standard",
  "Name": "Mail received",
  "HtmlBody": "<p>Hi {{name}},</p><p>You've received new mail: <strong>{{subject}}</strong></p><p><a href=\"{{cta_url}}\" style=\"display:inline-block;padding:12px 16px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none;\">View mail</a></p><p>If the button doesn't work, paste this into your browser: {{cta_url}}</p>",
  "TextBody": "Hi {{name}},\n\nYou've received new mail: {{subject}}\n\nView mail: {{cta_url}}\n",
  "TemplateModel": {
    "name": "there",
    "subject": "Mail subject",
    "cta_url": "https://example"
  }
}
```

**Send call:**
```js
await sendTemplateEmail(user.email, 'mail-received', {
  name: user.first_name || user.email,
  subject: mailItem.subject,
  cta_path: `/mail/${mailItem.id}`
});
```

## Common CTA Paths

| Purpose | `cta_path` | Description |
|---------|------------|-------------|
| Billing overview | `/billing` | Main billing page |
| Payment method | `/billing#payment` | Payment method section |
| Plan management | `/billing#plan` | Plan selection section |
| Invoices | `/billing#invoices` | Invoice history section |
| Profile/KYC | `/profile` | Profile and KYC page |
| Dashboard | `/dashboard` | Main dashboard |
| Mail inbox | `/mail` | Mail list |
| Forwarding | `/forwarding` | Forwarding requests |
| Specific mail | `/mail/123` | Specific mail item |

## Security Notes

- All `cta_path` values are validated by `safeNext()` to prevent open redirects
- External URLs should use `cta_url` instead of `cta_path`
- The middleware automatically redirects unauthenticated users to login with the correct `next` parameter
