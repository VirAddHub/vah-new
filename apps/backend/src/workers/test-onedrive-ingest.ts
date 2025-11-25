/**
 * Test script for OneDrive mail ingestion
 * 
 * Tests the filename parser and validates the logic without requiring
 * actual OneDrive access or database connection.
 * 
 * Run: ts-node --project tsconfig.server.json src/workers/test-onedrive-ingest.ts
 */

import { parseMailFilename } from '../services/mailFilenameParser';

console.log('🧪 Testing OneDrive Mail Ingestion Components\n');

// Test filename parser
console.log('📝 Testing Filename Parser:\n');

const testCases = [
  { filename: 'user4_02-12-2025_companieshouse.pdf', expected: { userId: 4, sourceSlug: 'companieshouse' } },
  { filename: 'user12_01-01-2026_hmrc.pdf', expected: { userId: 12, sourceSlug: 'hmrc' } },
  { filename: 'user007_15-03-2026_bank.pdf', expected: { userId: 7, sourceSlug: 'bank' } },
  { filename: 'user0007-15-03-2026-hmrc.pdf', expected: { userId: 7, sourceSlug: 'hmrc' } },
  { filename: 'user12_2025-11-01_bank-letter.pdf', expected: { userId: 12, sourceSlug: 'bank' } },
  { filename: 'user4_10_10_2024_barclays.pdf', expected: { userId: 4, sourceSlug: 'barclays' } },
  { filename: 'random-document.pdf', expected: null },
  { filename: 'invoice.pdf', expected: null },
  { filename: 'user4.pdf', expected: null },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = parseMailFilename(testCase.filename);
  const success = JSON.stringify(result) === JSON.stringify(testCase.expected);
  
  if (success) {
    console.log(`✅ "${testCase.filename}"`);
    console.log(`   → ${result ? `userId=${result.userId}, tag=${result.sourceSlug}` : 'null (skipped)'}`);
    passed++;
  } else {
    console.log(`❌ "${testCase.filename}"`);
    console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
    console.log(`   Got: ${JSON.stringify(result)}`);
    failed++;
  }
  console.log('');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All filename parser tests passed!\n');
  console.log('💡 Next steps:');
  console.log('   1. Deploy to Render with environment variables set');
  console.log('   2. Test the webhook endpoint:');
  console.log('      curl -X POST https://your-backend.onrender.com/api/internal/mail/from-onedrive \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -H "x-mail-import-secret: YOUR_SECRET" \\');
  console.log('        -d \'{"userId":4,"sourceSlug":"companieshouse","fileName":"test.pdf"}\'');
  console.log('   3. Check Render logs for the worker output');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the parser logic.\n');
  process.exit(1);
}

