/* eslint-disable no-console */
// Test script to send Companies House verification email
import { sendChVerificationNudge, sendChVerificationReminder } from '../src/lib/mailer';
import { ENV } from '../src/env';

async function main() {
    const [type = 'nudge', email = '', name = 'Test User'] = process.argv.slice(2);

    if (!email) {
        console.error('Usage: npm run test:ch-email -- [nudge|reminder] <email> [name]');
        console.error('Example: npm run test:ch-email -- nudge test@example.com "John Doe"');
        process.exit(1);
    }

    // Check configuration
    console.log('📧 Email Configuration:');
    console.log(`  POSTMARK_TOKEN: ${ENV.POSTMARK_TOKEN ? 'SET (' + ENV.POSTMARK_TOKEN.substring(0, 10) + '...)' : '❌ NOT SET'}`);
    console.log(`  EMAIL_KYC: ${ENV.EMAIL_KYC}`);
    console.log(`  EMAIL_FROM: ${ENV.EMAIL_FROM}`);
    console.log(`  APP_BASE_URL: ${ENV.APP_BASE_URL}`);
    console.log('');

    if (!ENV.POSTMARK_TOKEN) {
        console.error('❌ POSTMARK_TOKEN is not set. Cannot send email.');
        console.error('   Set POSTMARK_TOKEN in your .env file or environment variables.');
        process.exit(1);
    }

    try {
        if (type === 'nudge') {
            console.log(`📤 Sending CH verification nudge to ${email}...`);
            await sendChVerificationNudge({
                email,
                first_name: name,
            });
            console.log('✅ Nudge email sent successfully!');
        } else if (type === 'reminder') {
            console.log(`📤 Sending CH verification reminder to ${email}...`);
            await sendChVerificationReminder({
                email,
                first_name: name,
            });
            console.log('✅ Reminder email sent successfully!');
        } else {
            console.error(`Invalid type: ${type}. Use 'nudge' or 'reminder'`);
            process.exit(1);
        }
    } catch (error: any) {
        console.error('❌ Failed to send email:', error?.message || error);
        if (error?.response) {
            console.error('   Postmark API Response:', JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

main();

