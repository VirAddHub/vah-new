// Test template variables mapping
// Usage: npm run test:variables

import * as postmark from 'postmark';

const {
    POSTMARK_TOKEN = "",
    POSTMARK_STREAM = "outbound",
    EMAIL_FROM = "hello@virtualaddresshub.co.uk",
    EMAIL_FROM_NAME = "VirtualAddressHub",
    EMAIL_REPLY_TO = "support@virtualaddresshub.co.uk",
    APP_BASE_URL = "https://vah-new-frontend-75d6.vercel.app",
} = process.env;

async function testTemplateVariables() {
    if (!POSTMARK_TOKEN) {
        console.error("❌ POSTMARK_TOKEN not set");
        process.exit(1);
    }

    const client = new postmark.ServerClient(POSTMARK_TOKEN);
    const testEmail = "support@virtualaddresshub.co.uk";

    console.log("🧪 Testing template variable mapping...\n");

    const tests = [
        {
            name: "Password Reset",
            alias: "password-reset-email",
            variables: {
                first_name: "Test User",
                reset_link: `${APP_BASE_URL}/reset?token=test123`,
                expiry_minutes: "60"
            }
        },
        {
            name: "Welcome Email",
            alias: "welcome-email",
            variables: {
                first_name: "Test User",
                dashboard_link: `${APP_BASE_URL}/dashboard`
            }
        },
        {
            name: "KYC Approved",
            alias: "kyc-approved",
            variables: {
                first_name: "Test User",
                virtual_address_line_1: "123 Business Street",
                virtual_address_line_2: "Suite 100",
                postcode: "SW1A 1AA",
                dashboard_link: `${APP_BASE_URL}/dashboard`
            }
        },
        {
            name: "Invoice Sent",
            alias: "invoice-sent",
            variables: {
                name: "Test User",
                invoice_number: "INV-123456",
                amount: "£29.99",
                cta_url: `${APP_BASE_URL}/billing`
            }
        },
        {
            name: "Mail Forwarded",
            alias: "mail-forwarded",
            variables: {
                name: "Test User",
                tracking_number: "TRK123456789",
                carrier: "Royal Mail",
                cta_url: `${APP_BASE_URL}/mail`
            }
        }
    ];

    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name}`);

            const response = await client.sendEmailWithTemplate({
                From: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
                To: testEmail,
                TemplateAlias: test.alias,
                TemplateModel: test.variables,
                MessageStream: POSTMARK_STREAM,
                ReplyTo: EMAIL_REPLY_TO,
            });

            console.log(`  ✅ SUCCESS - MessageID: ${response.MessageID}`);
            console.log(`  📧 Variables sent:`, Object.keys(test.variables).join(', '));

        } catch (error: any) {
            console.log(`  ❌ FAILED - ${error.message}`);
            if (error.message.includes('Template')) {
                console.log(`  💡 Check if template '${test.alias}' exists in Postmark`);
            }
        }
        console.log("");
    }

    console.log("🎉 Template variable testing complete!");
    console.log(`📧 Check ${testEmail} for test emails`);
}

testTemplateVariables().catch(console.error);
