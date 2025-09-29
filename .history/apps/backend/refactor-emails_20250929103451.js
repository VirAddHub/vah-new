#!/usr/bin/env node

// Script to refactor email calls in server.js.bak
const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js.bak');
const backupFile = path.join(__dirname, 'server.js.bak.backup');

// Create backup
fs.copyFileSync(serverFile, backupFile);
console.log('✅ Created backup:', backupFile);

// Read the file
let content = fs.readFileSync(serverFile, 'utf8');

// Add imports at the top (after the existing requires)
const importCode = `
// Import new mailer system
const { sendTemplateEmail } = require('./src/lib/mailer.ts');
const { Templates } = require('./src/lib/postmark-templates.ts');
`;

// Find the right place to insert imports (after the last require)
const lastRequireIndex = content.lastIndexOf('require(');
const nextLineAfterRequire = content.indexOf('\n', lastRequireIndex);
const insertPoint = content.indexOf('\n', nextLineAfterRequire) + 1;

content = content.slice(0, insertPoint) + importCode + content.slice(insertPoint);

// Replace all sendTemplateEmail calls
const replacements = [
    // Password Reset
    {
        from: /await sendTemplateEmail\('password-reset-email', user\.email, \{\s*first_name: user\.first_name \|\| '',\s*reset_url: `\$\{APP_URL\}\/reset-password\?token=\$\{token\}`,(\s*expires_in_hours: \d+,)?\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.PasswordReset,
    model: {
        first_name: user.first_name || '',$1
    },
    cta_path: \`/reset-password?token=\${token}\`
});`
    },
    
    // Password Changed
    {
        from: /await sendTemplateEmail\('password-changed-confirmation', ([^,]+), \{\s*first_name: ([^,]+),(\s*security_tips_url: `\$\{APP_URL\}\/security`,)?\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: $1,
    templateAlias: Templates.PasswordChanged,
    model: {
        first_name: $2,$3
    },
    cta_path: '/profile#security'
});`
    },
    
    // Welcome Email
    {
        from: /await sendTemplateEmail\('welcome-email', user\.email, \{\s*first_name: user\.first_name \|\| '',\s*dashboard_url: APP_URL,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.Welcome,
    model: {
        first_name: user.first_name || '',
    },
    cta_path: '/dashboard'
});`
    },
    
    // Plan Cancelled
    {
        from: /await sendTemplateEmail\('plan-cancelled', me\.email, \{\s*first_name: me\.first_name \|\| '',\s*reactivate_url: `\$\{APP_URL\}\/billing`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: me.email,
    templateAlias: Templates.PlanCancelled,
    model: {
        first_name: me.first_name || '',
    },
    cta_path: '/billing#plan'
});`
    },
    
    // KYC Submitted
    {
        from: /await sendTemplateEmail\('kyc-submitted', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*help_url: `\$\{APP_URL\}\/kyc`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycSubmitted,
    model: {
        first_name: u.first_name || '',
    },
    cta_path: '/profile'
});`
    },
    
    // Support Request Received
    {
        from: /await sendTemplateEmail\('support-request-received', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*ticket_id: String\(info\.lastInsertRowid\),\s*subject,\s*view_url: `\$\{APP_URL\}\/support\/tickets\/\$\{info\.lastInsertRowid\}`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.SupportRequestReceived,
    model: {
        first_name: u.first_name || '',
        ticket_id: String(info.lastInsertRowid),
        subject,
    },
    cta_path: '/support'
});`
    },
    
    // Support Request Closed
    {
        from: /await sendTemplateEmail\('support-request-closed', row\.email, \{\s*first_name: row\.first_name \|\| '',\s*ticket_id: String\(id\),\s*satisfaction_url: `\$\{APP_URL\}\/support\/feedback\/\$\{id\}`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: row.email,
    templateAlias: Templates.SupportRequestClosed,
    model: {
        first_name: row.first_name || '',
        ticket_id: String(id),
    },
    cta_path: '/support'
});`
    },
    
    // KYC Approved
    {
        from: /await sendTemplateEmail\('kyc-approved', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*dashboard_url: APP_URL,(\s*certificate_url: `\$\{CERTIFICATE_BASE_URL\}\/\$\{id\}\/proof-of-address\.pdf`,)?\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycApproved,
    model: {
        first_name: u.first_name || '',$1
    },
    cta_path: '/dashboard'
});`
    },
    
    // KYC Rejected
    {
        from: /await sendTemplateEmail\('kyc-rejected', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*reason: ([^,]+),\s*retry_url: `\$\{APP_URL\}\/kyc`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.KycRejected,
    model: {
        first_name: u.first_name || '',
        reason: $1,
    },
    cta_path: '/profile'
});`
    },
    
    // Mail After Cancellation
    {
        from: /await sendTemplateEmail\('mail-received-after-cancellation', owner\.email, \{\s*first_name: owner\.first_name \|\| '',\s*subject: subject \|\| 'Mail received',\s*options_url: `\$\{APP_URL\}\/billing`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailAfterCancellation,
    model: {
        first_name: owner.first_name || '',
        subject: subject || 'Mail received',
    },
    cta_path: '/billing#plan'
});`
    },
    
    // Mail Scanned
    {
        from: /await sendTemplateEmail\('mail-scanned', owner\.email, \{\s*first_name: owner\.first_name \|\| '',\s*subject: after\.subject \|\| 'New mail',\s*view_url: `\$\{APP_URL\}\/mail\/\$\{id\}`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailScanned,
    model: {
        first_name: owner.first_name || '',
        subject: after.subject || 'New mail',
    },
    cta_path: '/mail'
});`
    },
    
    // Mail Forwarded
    {
        from: /await sendTemplateEmail\('mail-forwarded', owner\.email, \{\s*first_name: owner\.first_name \|\| '',\s*subject: owner\.subject \|\| 'Your mail',\s*tracking_number: tracking_number \|\| '',\s*track_url: trackUrl,\s*help_url: APP_URL,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: owner.email,
    templateAlias: Templates.MailForwarded,
    model: {
        first_name: owner.first_name || '',
        subject: owner.subject || 'Your mail',
        tracking_number: tracking_number || '',
        track_url: trackUrl,
    },
    cta_path: '/forwarding'
});`
    },
    
    // Invoice Sent
    {
        from: /await sendTemplateEmail\('invoice-sent', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*invoice_url: p\.invoice_url \|\| `\$\{APP_URL\}\/billing`,\s*amount: p\.amount \? \(p\.amount \/ 100\)\.toFixed\(2\) : undefined,\s*currency: p\.currency \|\| 'GBP',\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.InvoiceSent,
    model: {
        first_name: u.first_name || '',
        invoice_url: p.invoice_url,
        amount: p.amount ? (p.amount / 100).toFixed(2) : undefined,
        currency: p.currency || 'GBP',
    },
    cta_path: '/billing#invoices'
});`
    },
    
    // Payment Failed
    {
        from: /await sendTemplateEmail\('payment-failed', u\.email, \{\s*first_name: u\.first_name \|\| '',\s*fix_url: `\$\{APP_URL\}\/billing`,\s*\}\);/g,
        to: `await sendTemplateEmail({
    to: u.email,
    templateAlias: Templates.PaymentFailed,
    model: {
        first_name: u.first_name || '',
    },
    cta_path: '/billing#payment'
});`
    }
];

// Apply replacements
let changesCount = 0;
replacements.forEach((replacement, index) => {
    const before = content;
    content = content.replace(replacement.from, replacement.to);
    if (content !== before) {
        changesCount++;
        console.log(`✅ Applied replacement ${index + 1}`);
    }
});

// Write the updated file
fs.writeFileSync(serverFile, content);

console.log(`\n🎉 Refactoring complete!`);
console.log(`📊 Applied ${changesCount} replacements`);
console.log(`💾 Updated: ${serverFile}`);
console.log(`🔒 Backup: ${backupFile}`);
