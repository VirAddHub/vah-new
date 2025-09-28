#!/usr/bin/env node
/**
 * Backend Smoke Tests
 * 
 * Tests the canonical endpoints to ensure they're working correctly.
 * Uses curl commands to test the actual running server.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_BASE_URL || 'https://vah-api-staging.onrender.com/api';
const TEST_RESULTS_FILE = path.join(__dirname, '../test-results/smoke-test-results.json');

// Ensure test results directory exists
const testResultsDir = path.dirname(TEST_RESULTS_FILE);
if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
}

// Test results
const results = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    }
};

/**
 * Run a curl command and return the result
 */
function runCurl(method, endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};
    const body = options.body;
    
    let curlCmd = `curl -s -w "\\n%{http_code}\\n%{time_total}" -X ${method}`;
    
    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
        curlCmd += ` -H "${key}: ${value}"`;
    });
    
    // Add body for POST/PUT/PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        curlCmd += ` -d '${JSON.stringify(body)}'`;
    }
    
    curlCmd += ` "${url}"`;
    
    try {
        const output = execSync(curlCmd, { encoding: 'utf8', timeout: 10000 });
        const lines = output.trim().split('\n');
        const responseBody = lines.slice(0, -2).join('\n');
        const statusCode = parseInt(lines[lines.length - 2]);
        const timeTotal = parseFloat(lines[lines.length - 1]);
        
        return {
            success: true,
            statusCode,
            responseBody,
            timeTotal,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            statusCode: 0,
            responseBody: '',
            timeTotal: 0,
            error: error.message
        };
    }
}

/**
 * Test an endpoint
 */
function testEndpoint(name, method, endpoint, expectedStatus = 200, options = {}) {
    console.log(`🧪 Testing ${method} ${endpoint}...`);
    
    const result = runCurl(method, endpoint, options);
    const testResult = {
        name,
        method,
        endpoint,
        expectedStatus,
        actualStatus: result.statusCode,
        success: result.success && result.statusCode === expectedStatus,
        responseTime: result.timeTotal,
        error: result.error,
        responseBody: result.responseBody ? result.responseBody.substring(0, 200) + '...' : ''
    };
    
    results.tests.push(testResult);
    results.summary.total++;
    
    if (testResult.success) {
        results.summary.passed++;
        console.log(`✅ ${name}: ${result.statusCode} (${result.timeTotal}s)`);
    } else {
        results.summary.failed++;
        console.log(`❌ ${name}: ${result.statusCode} (expected ${expectedStatus}) - ${result.error || 'HTTP error'}`);
    }
    
    return testResult;
}

/**
 * Run all smoke tests
 */
function runSmokeTests() {
    console.log('🚀 Starting Backend Smoke Tests...\n');
    
    // Health checks
    testEndpoint('Health Check', 'GET', '/healthz', 200);
    testEndpoint('API Ready', 'GET', '/api/ready', 200);
    testEndpoint('API Health', 'GET', '/api/healthz', 200);
    
    // Auth endpoints (public)
    testEndpoint('Auth Ping', 'GET', '/api/auth/ping', 200);
    
    // Auth endpoints (require auth - expect 401)
    testEndpoint('Auth Whoami (Unauthorized)', 'GET', '/api/auth/whoami', 401);
    testEndpoint('Auth Logout (Unauthorized)', 'POST', '/api/auth/logout', 401);
    
    // Profile endpoints (require auth - expect 401)
    testEndpoint('Profile Get (Unauthorized)', 'GET', '/api/profile', 401);
    
    // Mail endpoints (require auth - expect 401)
    testEndpoint('Mail Items (Unauthorized)', 'GET', '/api/mail-items', 401);
    testEndpoint('Mail Search (Unauthorized)', 'GET', '/api/mail-items/search?q=test', 401);
    
    // Forwarding endpoints (require auth - expect 401)
    testEndpoint('Forwarding Requests (Unauthorized)', 'GET', '/api/forwarding-requests', 401);
    testEndpoint('Forwarding Usage (Unauthorized)', 'GET', '/api/forwarding-requests/usage', 401);
    
    // Billing endpoints (require auth - expect 401)
    testEndpoint('Billing (Unauthorized)', 'GET', '/api/billing', 401);
    testEndpoint('Invoices (Unauthorized)', 'GET', '/api/invoices', 401);
    
    // Plans endpoints (public)
    testEndpoint('Plans', 'GET', '/api/plans', 200);
    
    // Email preferences (require auth - expect 401)
    testEndpoint('Email Prefs (Unauthorized)', 'GET', '/api/email-prefs', 401);
    
    // KYC endpoints (require auth - expect 401)
    testEndpoint('KYC Status (Unauthorized)', 'GET', '/api/kyc/status', 401);
    
    // Support endpoints (require auth - expect 401)
    testEndpoint('Tickets (Unauthorized)', 'GET', '/api/tickets', 401);
    
    // Admin endpoints (require admin auth - expect 401)
    testEndpoint('Admin Users (Unauthorized)', 'GET', '/api/admin/users', 401);
    testEndpoint('Admin Mail Items (Unauthorized)', 'GET', '/api/admin/mail-items', 401);
    testEndpoint('Admin Analytics (Unauthorized)', 'GET', '/api/admin/analytics', 401);
    
    // Dashboard endpoints (require auth - expect 401)
    testEndpoint('Dashboard Overview (Unauthorized)', 'GET', '/api/dashboard/overview', 401);
    testEndpoint('Dashboard Stats (Unauthorized)', 'GET', '/api/dashboard/stats', 401);
    
    // Test legacy endpoints (should redirect with deprecation headers)
    testEndpoint('Legacy Login (Deprecated)', 'POST', '/login', 401, {
        body: { email: 'test@example.com', password: 'test' }
    });
    testEndpoint('Legacy Whoami (Deprecated)', 'GET', '/whoami', 401);
    testEndpoint('Legacy Profile (Deprecated)', 'GET', '/profile', 401);
    testEndpoint('Legacy Plans (Deprecated)', 'GET', '/plans', 200);
    
    // Test invalid endpoints (expect 404)
    testEndpoint('Invalid Endpoint', 'GET', '/api/invalid-endpoint', 404);
    testEndpoint('Invalid Method', 'DELETE', '/api/plans', 405);
}

/**
 * Generate test report
 */
function generateReport() {
    const report = {
        ...results,
        summary: {
            ...results.summary,
            passRate: results.summary.total > 0 ? (results.summary.passed / results.summary.total * 100).toFixed(2) + '%' : '0%'
        }
    };
    
    // Write results to file
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 Smoke Test Summary:');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    
    // Print failed tests
    const failedTests = results.tests.filter(test => !test.success);
    if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(test => {
            console.log(`  - ${test.name}: ${test.method} ${test.endpoint} (${test.actualStatus})`);
        });
    }
    
    console.log(`\n📄 Detailed results saved to: ${TEST_RESULTS_FILE}`);
    
    return report.summary.failed === 0;
}

/**
 * Main execution
 */
function main() {
    try {
        runSmokeTests();
        const success = generateReport();
        
        if (success) {
            console.log('\n🎉 All smoke tests passed!');
            process.exit(0);
        } else {
            console.log('\n💥 Some smoke tests failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Smoke test error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { runSmokeTests, generateReport };

// If you choose to test webhooks while unconfigured, expect 501:
// await test('POST /webhooks-gc (unconfigured)', 'POST', '/webhooks-gc', 501);
// await test('POST /webhooks/sumsub (unconfigured)', 'POST', '/webhooks/sumsub', 501);
