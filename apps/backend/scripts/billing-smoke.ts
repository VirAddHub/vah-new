#!/usr/bin/env node
/**
 * Billing smoke test script
 * 
 * Verifies:
 * 1. Invoice totals match SUM(charge.amount_pence)
 * 2. /api/billing/invoices/:id returns invoice + items
 * 3. PDF download endpoint works
 * 
 * Usage:
 *   BACKEND_URL=https://your-backend.com JWT_TOKEN=your-jwt-token npm run billing-smoke
 * 
 * Or set environment variables:
 *   export BACKEND_URL=https://your-backend.com
 *   export JWT_TOKEN=your-jwt-token
 *   node apps/backend/scripts/billing-smoke.ts
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

if (!JWT_TOKEN) {
  console.error('❌ JWT_TOKEN environment variable is required');
  console.error('Usage: JWT_TOKEN=your-token BACKEND_URL=https://backend.com node billing-smoke.ts');
  process.exit(1);
}

interface Invoice {
  id: number;
  invoice_number: string;
  amount_pence: number;
  status: string;
  period_start?: string;
  period_end?: string;
}

interface InvoiceItem {
  service_date: string;
  description: string;
  amount_pence: number;
  currency: string;
  type: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response;
}

async function main() {
  console.log('🧪 Starting billing smoke tests...\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  let errors = 0;

  try {
    // Test 1: List invoices
    console.log('1️⃣  Testing GET /api/billing/invoices?page=1&page_size=1');
    const listResponse = await fetchWithAuth(
      `${BACKEND_URL}/api/billing/invoices?page=1&page_size=1`
    );
    const listData = await listResponse.json();

    if (!listData.ok || !listData.data?.items || listData.data.items.length === 0) {
      console.log('⚠️  No invoices found - skipping remaining tests');
      console.log('   This is OK if user has no invoices yet\n');
      process.exit(0);
    }

    const invoice: Invoice = listData.data.items[0];
    console.log(`   ✅ Found invoice: ${invoice.invoice_number} (ID: ${invoice.id})`);
    console.log(`   Amount: £${(invoice.amount_pence / 100).toFixed(2)}`);
    console.log(`   Status: ${invoice.status}\n`);

    // Test 2: Get invoice with items
    console.log(`2️⃣  Testing GET /api/billing/invoices/${invoice.id}`);
    const detailResponse = await fetchWithAuth(
      `${BACKEND_URL}/api/billing/invoices/${invoice.id}`
    );
    const detailData = await detailResponse.json();

    if (!detailData.ok || !detailData.data) {
      console.error(`   ❌ Failed to fetch invoice details`);
      errors++;
      throw new Error('Invoice details fetch failed');
    }

    const invoiceDetail = detailData.data.invoice;
    const items: InvoiceItem[] = detailData.data.items || [];

    console.log(`   ✅ Invoice details fetched`);
    console.log(`   Items count: ${items.length}`);

    // Verify invoice total matches sum of items
    const itemsSum = items.reduce((sum, item) => sum + Number(item.amount_pence || 0), 0);
    const invoiceAmount = Number(invoiceDetail.amount_pence || 0);

    console.log(`   Invoice amount_pence: ${invoiceAmount}`);
    console.log(`   Items sum (amount_pence): ${itemsSum}`);

    if (invoiceAmount !== itemsSum) {
      console.error(`   ❌ MISMATCH: Invoice amount (${invoiceAmount}) != Items sum (${itemsSum})`);
      console.error(`   Difference: ${itemsSum - invoiceAmount} pence`);
      errors++;
    } else {
      console.log(`   ✅ Invoice total matches items sum\n`);
    }

    // Test 3: Download PDF
    console.log(`3️⃣  Testing GET /api/billing/invoices/${invoice.id}/download`);
    try {
      const pdfResponse = await fetchWithAuth(
        `${BACKEND_URL}/api/billing/invoices/${invoice.id}/download`
      );

      if (!pdfResponse.ok) {
        throw new Error(`HTTP ${pdfResponse.status}`);
      }

      const contentType = pdfResponse.headers.get('content-type');
      const contentLength = pdfResponse.headers.get('content-length');

      if (contentType !== 'application/pdf') {
        console.error(`   ❌ Expected application/pdf, got ${contentType}`);
        errors++;
      } else {
        console.log(`   ✅ PDF downloaded successfully`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength || 'unknown'} bytes\n`);
      }
    } catch (pdfError: any) {
      console.error(`   ❌ PDF download failed: ${pdfError.message}`);
      errors++;
    }

    // Summary
    console.log('📊 Test Summary:');
    if (errors === 0) {
      console.log('   ✅ All tests passed!\n');
      process.exit(0);
    } else {
      console.log(`   ❌ ${errors} test(s) failed\n`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

