# Email Refactor Guide - CTA Path Migration

This guide shows how to refactor all `sendTemplateEmail` calls in `server.js.bak` to use the new mailer system with `cta_path`.

## Required Changes

### 1. Add Imports at Top of server.js.bak

```javascript
// Add these imports after the existing requires
const { sendTemplateEmail } = require('./src/lib/mailer.ts');
const { Templates } = require('./src/lib/postmark-templates.ts');
```

### 2. Replace All sendTemplateEmail Calls

#### Password Reset (line 640)
```javascript
// OLD:
await sendTemplateEmail('password-reset-email', user.email, {
    first_name: user.first_name || '',
    reset_url: `${APP_URL}/reset-password?token=${token}`,
    expires_in_hours: 1,
});

// NEW:
await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.PasswordReset,
    model: {
        first_name: user.first_name || '',
        expires_in_hours: 1,
    },
    cta_path: `/reset-password?token=${token}`
});
```

#### Password Changed (lines 669, 692)
```javascript
// OLD:
await sendTemplateEmail('password-changed-confirmation', user.email, {
    first_name: user.first_name || '',
    security_tips_url: `${APP_URL}/security`,
});

// NEW:
await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.PasswordChanged,
    model: {
        first_name: user.first_name || '',
    },
    cta_path: `/profile#security`
});
```

#### Welcome Email (line 755)
```javascript
// OLD:
await sendTemplateEmail('welcome-email', user.email, {
    first_name: user.first_name || '',
    dashboard_url: APP_URL,
});

// NEW:
await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.Welcome,
    model: {
        first_name: user.first_name || '',
    },
    cta_path: `/dashboard`
});
```

#### Plan Cancelled (line 1198)
```javascript
// OLD:
await sendTemplateEmail('plan-cancelled', me.email, {
    first_name: me.first_name || '',
    reactivate_url: `${APP_URL}/billing`,
});

// NEW:
await sendTemplateEmail({
    to: me.email,
    templateAlias: Templates.PlanCancelled,
    model: {
        first_name: me.first_name || '',
    },
    cta_path: `/billing#plan`
});
```

#### KYC Submitted (line 1215)
```javascript
// OLD:
await sendTemplateEmail('kyc-submitted', u.email, {
    first_name: u.first_name || '',
    help_url: `${APP_URL}/kyc`,
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycSubmitted,
    model: {
        first_name: u.first_name || '',
    },
    cta_path: `/profile`
});
```

#### Support Request Received (line 1256)
```javascript
// OLD:
await sendTemplateEmail('support-request-received', u.email, {
    first_name: u.first_name || '',
    ticket_id: String(info.lastInsertRowid),
    subject,
    view_url: `${APP_URL}/support/tickets/${info.lastInsertRowid}`,
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.SupportRequestReceived,
    model: {
        first_name: u.first_name || '',
        ticket_id: String(info.lastInsertRowid),
        subject,
    },
    cta_path: `/support`
});
```

#### Support Request Closed (line 1284)
```javascript
// OLD:
await sendTemplateEmail('support-request-closed', row.email, {
    first_name: row.first_name || '',
    ticket_id: String(id),
    satisfaction_url: `${APP_URL}/support/feedback/${id}`,
});

// NEW:
await sendTemplateEmail({
    to: row.email,
    templateAlias: Templates.SupportRequestClosed,
    model: {
        first_name: row.first_name || '',
        ticket_id: String(id),
    },
    cta_path: `/support`
});
```

#### KYC Approved (lines 1355, 1668)
```javascript
// OLD:
await sendTemplateEmail('kyc-approved', u.email, {
    first_name: u.first_name || '',
    dashboard_url: APP_URL,
    certificate_url: `${CERTIFICATE_BASE_URL}/${id}/proof-of-address.pdf`,
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycApproved,
    model: {
        first_name: u.first_name || '',
        certificate_url: `${CERTIFICATE_BASE_URL}/${id}/proof-of-address.pdf`,
    },
    cta_path: `/dashboard`
});
```

#### KYC Rejected (lines 1361, 1674)
```javascript
// OLD:
await sendTemplateEmail('kyc-rejected', u.email, {
    first_name: u.first_name || '',
    reason: rejection_reason || 'Verification was not approved',
    retry_url: `${APP_URL}/kyc`,
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycRejected,
    model: {
        first_name: u.first_name || '',
        reason: rejection_reason || 'Verification was not approved',
    },
    cta_path: `/profile`
});
```

#### Mail After Cancellation (line 1443)
```javascript
// OLD:
await sendTemplateEmail('mail-received-after-cancellation', owner.email, {
    first_name: owner.first_name || '',
    subject: subject || 'Mail received',
    options_url: `${APP_URL}/billing`,
});

// NEW:
await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailAfterCancellation,
    model: {
        first_name: owner.first_name || '',
        subject: subject || 'Mail received',
    },
    cta_path: `/billing#plan`
});
```

#### Mail Scanned (line 1505)
```javascript
// OLD:
await sendTemplateEmail('mail-scanned', owner.email, {
    first_name: owner.first_name || '',
    subject: after.subject || 'New mail',
    view_url: `${APP_URL}/mail/${id}`,
});

// NEW:
await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailScanned,
    model: {
        first_name: owner.first_name || '',
        subject: after.subject || 'New mail',
    },
    cta_path: `/mail`
});
```

#### Mail Forwarded (line 1565)
```javascript
// OLD:
await sendTemplateEmail('mail-forwarded', owner.email, {
    first_name: owner.first_name || '',
    subject: owner.subject || 'Your mail',
    tracking_number: tracking_number || '',
    track_url: trackUrl,
    help_url: APP_URL,
});

// NEW:
await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailForwarded,
    model: {
        first_name: owner.first_name || '',
        subject: owner.subject || 'Your mail',
        tracking_number: tracking_number || '',
        track_url: trackUrl,
    },
    cta_path: `/forwarding`
});
```

#### Invoice Sent (line 1621)
```javascript
// OLD:
await sendTemplateEmail('invoice-sent', u.email, {
    first_name: u.first_name || '',
    invoice_url: p.invoice_url || `${APP_URL}/billing`,
    amount: p.amount ? (p.amount / 100).toFixed(2) : undefined,
    currency: p.currency || 'GBP',
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.InvoiceSent,
    model: {
        first_name: u.first_name || '',
        invoice_url: p.invoice_url,
        amount: p.amount ? (p.amount / 100).toFixed(2) : undefined,
        currency: p.currency || 'GBP',
    },
    cta_path: `/billing#invoices`
});
```

#### Payment Failed (line 1633)
```javascript
// OLD:
await sendTemplateEmail('payment-failed', u.email, {
    first_name: u.first_name || '',
    fix_url: `${APP_URL}/billing`,
});

// NEW:
await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.PaymentFailed,
    model: {
        first_name: u.first_name || '',
    },
    cta_path: `/billing#payment`
});
```

## Summary

- **14 email calls** need to be refactored
- **All hardcoded URLs** replaced with `cta_path`
- **Template aliases** use `Templates.X` constants
- **Function signature** changes from `sendTemplateEmail(alias, to, model)` to `sendTemplateEmail({ to, templateAlias, model, cta_path })`
