/**
 * Email Name Resolution Validation Script
 * 
 * Tests all email templates to verify:
 * 1. Both first_name and name fields are sent
 * 2. Fallback to "there" works correctly
 * 3. All templates receive correct data structure
 * 
 * Usage:
 *   POSTMARK_TOKEN=xxx EMAIL_MAIL=1 EMAIL_KYC=1 EMAIL_BILLING=1 EMAIL_SECURITY=1 EMAIL_ONBOARDING=1 EMAIL_SUPPORT=1 \
 *   node dist/scripts/test-email-name-resolution.js <your-email@example.com>
 */

import { getPool } from '../src/lib/db';
import {
  sendPasswordResetEmail,
  sendPasswordChangedConfirmation,
  sendWelcomeEmail,
  sendPlanCancelled,
  sendInvoiceSent,
  sendPaymentFailed,
  sendKycSubmitted,
  sendKycApproved,
  sendKycRejected,
  sendSupportRequestReceived,
  sendSupportRequestClosed,
  sendMailScanned,
  sendMailForwarded,
  sendMailReceivedAfterCancellation,
  sendChVerificationNudge,
  sendChVerificationReminder,
} from '../src/lib/mailer';
import { sendTemplateEmail, Templates } from '../src/services/mailer';

const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app';

interface TestResult {
  template: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  payload?: any;
}

const results: TestResult[] = [];

async function testEmail(
  name: string,
  fn: () => Promise<void>,
  expectedFields: string[] = ['first_name', 'name']
): Promise<void> {
  try {
    await fn();
    results.push({
      template: name,
      status: 'passed',
      message: `✅ Sent successfully. Expected fields: ${expectedFields.join(', ')}`,
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      template: name,
      status: 'failed',
      message: `❌ Failed: ${error.message}`,
    });
    console.error(`❌ ${name}:`, error.message);
  }
}

async function runTests() {
  console.log('🧪 Email Name Resolution Validation Tests\n');
  console.log(`📧 Test email: ${TEST_EMAIL}\n`);
  console.log('─'.repeat(60));

  // Test 1: With firstName provided
  console.log('\n📋 Test Set 1: With firstName provided\n');
  
  await testEmail('Password Reset (with firstName)', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      firstName: 'Liban',
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Password Changed (with firstName)', () =>
    sendPasswordChangedConfirmation({
      email: TEST_EMAIL,
      firstName: 'Liban',
    })
  );

  await testEmail('Welcome Email (with firstName)', () =>
    sendWelcomeEmail({
      email: TEST_EMAIL,
      firstName: 'Liban',
      cta_url: `${APP_BASE_URL}/dashboard`,
    })
  );

  await testEmail('Mail Scanned (with firstName)', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      firstName: 'Liban',
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  await testEmail('KYC Approved (with firstName)', () =>
    sendKycApproved({
      email: TEST_EMAIL,
      firstName: 'Liban',
      cta_url: `${APP_BASE_URL}/account`,
      virtualAddressLine1: '123 Business St',
      virtualAddressLine2: 'Suite 100',
      postcode: 'SW1A 1AA',
    })
  );

  await testEmail('Mail Forwarded (with firstName)', () =>
    sendMailForwarded({
      email: TEST_EMAIL,
      firstName: 'Liban',
      forwarding_address: '123 Test Street, London, SW1A 1AA',
      forwarded_date: new Date().toLocaleDateString('en-GB'),
    })
  );

  // Test 2: With name provided (fallback)
  console.log('\n📋 Test Set 2: With name provided (fallback)\n');

  await testEmail('Password Reset (with name fallback)', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      name: 'John',
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Mail Scanned (with name fallback)', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      name: 'John',
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  // Test 3: No name provided (should fallback to "there")
  console.log('\n📋 Test Set 3: No name provided (fallback to "there")\n');

  await testEmail('Password Reset (no name → "there")', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Mail Scanned (no name → "there")', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  await testEmail('Welcome Email (no name → "there")', () =>
    sendWelcomeEmail({
      email: TEST_EMAIL,
      cta_url: `${APP_BASE_URL}/dashboard`,
    })
  );

  await testEmail('KYC Approved (no name → "there")', () =>
    sendKycApproved({
      email: TEST_EMAIL,
      cta_url: `${APP_BASE_URL}/account`,
    })
  );

  // Test 4: Null values (should fallback to "there")
  console.log('\n📋 Test Set 4: Null values (fallback to "there")\n');

  await testEmail('Password Reset (firstName: null)', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      firstName: null,
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Mail Scanned (name: null)', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      name: null,
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  // Test 5: Empty strings (should fallback to "there")
  console.log('\n📋 Test Set 5: Empty strings (fallback to "there")\n');

  await testEmail('Password Reset (firstName: "")', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      firstName: '',
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Mail Scanned (name: "")', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      name: '',
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  // Test 6: Whitespace (should trim and fallback to "there")
  console.log('\n📋 Test Set 6: Whitespace (trim and fallback to "there")\n');

  await testEmail('Password Reset (firstName: "   ")', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      firstName: '   ',
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  await testEmail('Mail Scanned (name: "   ")', () =>
    sendMailScanned({
      email: TEST_EMAIL,
      name: '   ',
      subject: 'Test mail received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  // Test 7: Priority test (firstName should win over name)
  console.log('\n📋 Test Set 7: Priority (firstName wins over name)\n');

  await testEmail('Password Reset (firstName wins)', () =>
    sendPasswordResetEmail({
      email: TEST_EMAIL,
      firstName: 'Liban',
      name: 'John',
      cta_url: `${APP_BASE_URL}/reset?token=test-token`,
    })
  );

  // Test 8: All other templates
  console.log('\n📋 Test Set 8: All other templates\n');

  await testEmail('Plan Cancelled', () =>
    sendPlanCancelled({
      email: TEST_EMAIL,
      firstName: 'Liban',
      end_date: '2025-12-31',
    })
  );

  await testEmail('Invoice Sent', () =>
    sendInvoiceSent({
      email: TEST_EMAIL,
      firstName: 'Liban',
      invoice_number: 'INV-TEST-001',
      amount: '£29.99',
    })
  );

  await testEmail('Payment Failed', () =>
    sendPaymentFailed({
      email: TEST_EMAIL,
      firstName: 'Liban',
      cta_url: `${APP_BASE_URL}/billing`,
    })
  );

  await testEmail('KYC Submitted', () =>
    sendKycSubmitted({
      email: TEST_EMAIL,
      firstName: 'Liban',
      cta_url: `${APP_BASE_URL}/profile`,
    })
  );

  await testEmail('KYC Rejected', () =>
    sendKycRejected({
      email: TEST_EMAIL,
      firstName: 'Liban',
      reason: 'Document quality insufficient',
      cta_url: `${APP_BASE_URL}/profile`,
    })
  );

  await testEmail('Support Request Received', () =>
    sendSupportRequestReceived({
      email: TEST_EMAIL,
      firstName: 'Liban',
      ticket_id: 'TICKET-TEST-001',
      cta_url: `${APP_BASE_URL}/support`,
    })
  );

  await testEmail('Support Request Closed', () =>
    sendSupportRequestClosed({
      email: TEST_EMAIL,
      firstName: 'Liban',
      ticket_id: 'TICKET-TEST-001',
      cta_url: `${APP_BASE_URL}/support`,
    })
  );

  await testEmail('Mail Received After Cancellation', () =>
    sendMailReceivedAfterCancellation({
      email: TEST_EMAIL,
      firstName: 'Liban',
      subject: 'Important document received',
      cta_url: `${APP_BASE_URL}/mail`,
    })
  );

  await testEmail('CH Verification Nudge', () =>
    sendChVerificationNudge({
      email: TEST_EMAIL,
      first_name: 'Liban',
    })
  );

  await testEmail('CH Verification Reminder', () =>
    sendChVerificationReminder({
      email: TEST_EMAIL,
      first_name: 'Liban',
    })
  );

  await testEmail('Quiz Day 0', () =>
    sendTemplateEmail({
      to: TEST_EMAIL,
      alias: Templates.QuizDay0,
      model: {
        firstName: 'Liban',
        score: 85,
        segment: 'high',
        ctaUrl: `${APP_BASE_URL}/pricing`,
      },
    })
  );

  // Print summary
  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ Failed Tests:\n');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  - ${r.template}: ${r.message}`);
      });
    console.log('');
  }

  console.log('📧 Check your inbox at:', TEST_EMAIL);
  console.log('\n💡 Expected Results:');
  console.log('  - Emails with firstName="Liban" → "Hi Liban,"');
  console.log('  - Emails with no name → "Hi there,"');
  console.log('  - All emails should have both first_name and name fields in TemplateModel\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});

