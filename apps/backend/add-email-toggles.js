#!/usr/bin/env node

// Script to add email feature toggles to server.js.bak
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

// Define email family mappings
const emailMappings = [
    // Security emails
    { pattern: /Templates\.PasswordReset/, flag: 'EMAIL_SECURITY' },
    { pattern: /Templates\.PasswordChanged/, flag: 'EMAIL_SECURITY' },

    // Onboarding emails
    { pattern: /Templates\.Welcome/, flag: 'EMAIL_ONBOARDING' },

    // Billing emails
    { pattern: /Templates\.PlanCancelled/, flag: 'EMAIL_BILLING' },
    { pattern: /Templates\.InvoiceSent/, flag: 'EMAIL_BILLING' },
    { pattern: /Templates\.PaymentFailed/, flag: 'EMAIL_BILLING' },

    // KYC emails
    { pattern: /Templates\.KycSubmitted/, flag: 'EMAIL_KYC' },
    { pattern: /Templates\.KycApproved/, flag: 'EMAIL_KYC' },
    { pattern: /Templates\.KycRejected/, flag: 'EMAIL_KYC' },

    // Support emails
    { pattern: /Templates\.SupportRequestReceived/, flag: 'EMAIL_SUPPORT' },
    { pattern: /Templates\.SupportRequestClosed/, flag: 'EMAIL_SUPPORT' },

    // Mail emails
    { pattern: /Templates\.MailAfterCancellation/, flag: 'EMAIL_MAIL' },
    { pattern: /Templates\.MailScanned/, flag: 'EMAIL_MAIL' },
    { pattern: /Templates\.MailForwarded/, flag: 'EMAIL_MAIL' },
];

// Apply feature toggles to each email call
emailMappings.forEach(({ pattern, flag }) => {
    // Find sendTemplateEmail calls with this template
    const regex = new RegExp(`(\\s*)(await sendTemplateEmail\\(\\{[\\s\\S]*?templateAlias: ${pattern.source}[\\s\\S]*?\\}\\);?)`, 'g');

    content = content.replace(regex, (match, indent) => {
        return `${indent}if (${flag}) {\n${match}\n${indent}}`;
    });
});

// Write the updated file
fs.writeFileSync(serverFile, content);

console.log('✅ Added email feature toggles to server.js.bak');
console.log('📊 Applied toggles for:', emailMappings.map(m => m.flag).join(', '));
