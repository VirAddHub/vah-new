#!/usr/bin/env node

// Script to properly add email feature toggles to server.js.bak
const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js.bak');

// Read the file
let content = fs.readFileSync(serverFile, 'utf8');

// Add import after the existing mailer imports
const importCode = `
// Import email feature flags
const { EMAIL_ONBOARDING, EMAIL_BILLING, EMAIL_KYC, EMAIL_MAIL, EMAIL_SUPPORT, EMAIL_SECURITY } = require('./src/lib/email-flags.ts');
`;

// Find the right place to insert imports (after the mailer imports)
const mailerImportIndex = content.lastIndexOf('const { Templates } = require');
const nextLineAfterImport = content.indexOf('\n', mailerImportIndex);
const insertPoint = content.indexOf('\n', nextLineAfterImport) + 1;

content = content.slice(0, insertPoint) + importCode + content.slice(insertPoint);

// Define specific patterns for each email type
const replacements = [
    // Password Reset (Security)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: user\.email,\s*templateAlias: Templates\.PasswordReset,[\s\S]*?cta_path: `\/reset-password\?token=\$\{token\}`\s*\}\);)/g,
        replacement: '$1if (EMAIL_SECURITY) {\n$1    $2\n$1}',
        flag: 'EMAIL_SECURITY'
    },

    // Password Changed (Security)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: [^,]+,\s*templateAlias: Templates\.PasswordChanged,[\s\S]*?cta_path: '\/profile#security'\s*\}\);)/g,
        replacement: '$1if (EMAIL_SECURITY) {\n$1    $2\n$1}',
        flag: 'EMAIL_SECURITY'
    },

    // Welcome (Onboarding)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: user\.email,\s*templateAlias: Templates\.Welcome,[\s\S]*?cta_path: '\/dashboard'\s*\}\);)/g,
        replacement: '$1if (EMAIL_ONBOARDING) {\n$1    $2\n$1}',
        flag: 'EMAIL_ONBOARDING'
    },

    // Plan Cancelled (Billing)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: me\.email,\s*templateAlias: Templates\.PlanCancelled,[\s\S]*?cta_path: '\/billing#plan'\s*\}\);)/g,
        replacement: '$1if (EMAIL_BILLING) {\n$1    $2\n$1}',
        flag: 'EMAIL_BILLING'
    },

    // Invoice Sent (Billing)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.InvoiceSent,[\s\S]*?cta_path: '\/billing#invoices'\s*\}\);)/g,
        replacement: '$1if (EMAIL_BILLING) {\n$1    $2\n$1}',
        flag: 'EMAIL_BILLING'
    },

    // Payment Failed (Billing)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.PaymentFailed,[\s\S]*?cta_path: '\/billing#payment'\s*\}\);)/g,
        replacement: '$1if (EMAIL_BILLING) {\n$1    $2\n$1}',
        flag: 'EMAIL_BILLING'
    },

    // KYC Submitted (KYC)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.KycSubmitted,[\s\S]*?cta_path: '\/profile'\s*\}\);)/g,
        replacement: '$1if (EMAIL_KYC) {\n$1    $2\n$1}',
        flag: 'EMAIL_KYC'
    },

    // KYC Approved (KYC)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.KycApproved,[\s\S]*?cta_path: '\/dashboard'\s*\}\);)/g,
        replacement: '$1if (EMAIL_KYC) {\n$1    $2\n$1}',
        flag: 'EMAIL_KYC'
    },

    // KYC Rejected (KYC)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.KycRejected,[\s\S]*?cta_path: '\/profile'\s*\}\);)/g,
        replacement: '$1if (EMAIL_KYC) {\n$1    $2\n$1}',
        flag: 'EMAIL_KYC'
    },

    // Support Request Received (Support)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: u\.email,\s*templateAlias: Templates\.SupportRequestReceived,[\s\S]*?cta_path: '\/support'\s*\}\);)/g,
        replacement: '$1if (EMAIL_SUPPORT) {\n$1    $2\n$1}',
        flag: 'EMAIL_SUPPORT'
    },

    // Support Request Closed (Support)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: row\.email,\s*templateAlias: Templates\.SupportRequestClosed,[\s\S]*?cta_path: '\/support'\s*\}\);)/g,
        replacement: '$1if (EMAIL_SUPPORT) {\n$1    $2\n$1}',
        flag: 'EMAIL_SUPPORT'
    },

    // Mail After Cancellation (Mail)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: owner\.email,\s*templateAlias: Templates\.MailAfterCancellation,[\s\S]*?cta_path: '\/billing#plan'\s*\}\);)/g,
        replacement: '$1if (EMAIL_MAIL) {\n$1    $2\n$1}',
        flag: 'EMAIL_MAIL'
    },

    // Mail Scanned (Mail)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: owner\.email,\s*templateAlias: Templates\.MailScanned,[\s\S]*?cta_path: '\/mail'\s*\}\);)/g,
        replacement: '$1if (EMAIL_MAIL) {\n$1    $2\n$1}',
        flag: 'EMAIL_MAIL'
    },

    // Mail Forwarded (Mail)
    {
        pattern: /(\s*)(await sendTemplateEmail\(\{\s*to: owner\.email,\s*templateAlias: Templates\.MailForwarded,[\s\S]*?cta_path: '\/forwarding'\s*\}\);)/g,
        replacement: '$1if (EMAIL_MAIL) {\n$1    $2\n$1}',
        flag: 'EMAIL_MAIL'
    }
];

// Apply replacements
let changesCount = 0;
replacements.forEach(({ pattern, replacement, flag }) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
        changesCount++;
        console.log(`✅ Applied ${flag} toggle`);
    }
});

// Write the updated file
fs.writeFileSync(serverFile, content);

console.log(`\n🎉 Email feature toggles applied!`);
console.log(`📊 Applied ${changesCount} toggles`);
