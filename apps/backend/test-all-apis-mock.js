/**
 * Comprehensive API Mock Testing Script
 * Tests all endpoints with mock data
 */

// Use Render backend by default, fallback to local mock
// Note: Paths already include /api/, so BASE_URL should NOT include /api
const BASE_URL = process.env.BACKEND_API_ORIGIN ||
    process.env.RENDER_API_URL ||
    'https://vah-api-staging.onrender.com' ||
    process.env.MOCK_API_URL ||
    'http://localhost:3002';

// Mock JWT token (for testing auth endpoints)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYwMDAwMDAwMH0.test';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results storage
const results = {
    passed: [],
    failed: [],
    skipped: [],
};

// Helper function to make API calls
async function testEndpoint(name, method, path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.auth && { 'Authorization': `Bearer ${MOCK_JWT}` }),
        ...(options.cookies && { 'Cookie': options.cookies }),
        ...options.headers,
    };

    try {
        const config = {
            method,
            headers,
            ...(options.body && { body: JSON.stringify(options.body) }),
        };

        const response = await fetch(url, config);
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await response.json() : await response.text();

        // Check if response is acceptable (200-299, or expected error codes)
        const isSuccess = response.ok || (options.expectError && options.expectError.includes(response.status));

        if (isSuccess) {
            results.passed.push({ name, method, path, status: response.status });
            log(`✓ ${name} (${method} ${path}) - ${response.status}`, 'green');
            return { success: true, status: response.status, data };
        } else {
            results.failed.push({ name, method, path, status: response.status, error: data?.error || data });
            log(`✗ ${name} (${method} ${path}) - ${response.status}`, 'red');
            if (data?.error) log(`  Error: ${data.error}`, 'yellow');
            return { success: false, status: response.status, data };
        }
    } catch (error) {
        results.failed.push({ name, method, path, error: error.message });
        log(`✗ ${name} (${method} ${path}) - Error: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

// Mock data generators
const mocks = {
    user: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
    },
    mailItem: {
        subject: 'Test Mail Item',
        from: 'sender@example.com',
        received_at: Date.now(),
    },
    forwardingRequest: {
        to_name: 'John Doe',
        address1: '123 Test Street',
        city: 'London',
        postal: 'SW1A 1AA',
        country: 'GB',
    },
    contact: {
        name: 'Test Contact',
        email: 'contact@example.com',
        subject: 'Test Inquiry',
        message: 'This is a test message',
    },
    billing: {
        plan_id: '1',
    },
};

// Define all API endpoints to test
const endpoints = [
    // Health & Status
    { name: 'Health Check', method: 'GET', path: '/api/health' },
    { name: 'Healthz', method: 'GET', path: '/api/healthz' },
    { name: 'Version', method: 'GET', path: '/api/__version' },
    { name: 'Metrics', method: 'GET', path: '/api/metrics' },

    // Auth
    { name: 'Who Am I', method: 'GET', path: '/api/auth/whoami', auth: true },
    { name: 'Login', method: 'POST', path: '/api/auth/login', body: { email: mocks.user.email, password: mocks.user.password } },
    { name: 'Register', method: 'POST', path: '/api/auth/register', body: mocks.user },
    { name: 'Logout', method: 'POST', path: '/api/auth/logout', auth: true },

    // Profile
    { name: 'Get Profile', method: 'GET', path: '/api/profile', auth: true },
    { name: 'Update Profile', method: 'PATCH', path: '/api/profile', body: { name: 'Updated Name' }, auth: true },

    // Mail
    { name: 'List Mail Items', method: 'GET', path: '/api/mail-items', auth: true },
    { name: 'Get Mail Item', method: 'GET', path: '/api/mail-items/1', auth: true },
    { name: 'Update Mail Item', method: 'PATCH', path: '/api/mail-items/1', body: { subject: 'Updated' }, auth: true },
    { name: 'Delete Mail Item', method: 'DELETE', path: '/api/mail-items/1', auth: true },

    // Forwarding
    { name: 'List Forwarding Requests', method: 'GET', path: '/api/forwarding/requests', auth: true },
    { name: 'Create Forwarding Request', method: 'POST', path: '/api/forwarding/requests', body: mocks.forwardingRequest, auth: true },

    // Billing
    { name: 'Get Billing Overview', method: 'GET', path: '/api/billing/overview', auth: true },
    { name: 'Get Invoices', method: 'GET', path: '/api/billing/invoices', auth: true },
    { name: 'Get Subscription Status', method: 'GET', path: '/api/billing/subscription-status', auth: true },

    // Plans
    { name: 'Get Public Plans', method: 'GET', path: '/api/plans' },
    { name: 'Get Plan by ID', method: 'GET', path: '/api/plans/1' },

    // Contact & Support
    { name: 'Submit Contact Form', method: 'POST', path: '/api/contact', body: mocks.contact },
    { name: 'Get Support Info', method: 'GET', path: '/api/support/info' },

    // Quiz
    { name: 'Submit Quiz', method: 'POST', path: '/api/quiz/submit', body: { name: 'Test', email: 'test@example.com', answers: {} } },
    { name: 'Get Quiz Stats', method: 'GET', path: '/api/quiz/stats' },

    // Admin - Overview
    { name: 'Admin Overview', method: 'GET', path: '/api/admin/overview', auth: true },
    { name: 'Admin Health Summary', method: 'GET', path: '/api/admin/health/summary', auth: true },
    { name: 'Admin Health Dependencies', method: 'GET', path: '/api/admin/health/dependencies', auth: true },
    { name: 'Admin Activity', method: 'GET', path: '/api/admin/activity', auth: true },

    // Admin - Users
    { name: 'Admin List Users', method: 'GET', path: '/api/admin/users', auth: true },
    { name: 'Admin Get User', method: 'GET', path: '/api/admin/users/1', auth: true },
    { name: 'Admin Update User', method: 'PATCH', path: '/api/admin/users/1', body: { name: 'Updated' }, auth: true },
    { name: 'Admin User Stats', method: 'GET', path: '/api/admin/users/stats', auth: true },

    // Admin - Forwarding
    { name: 'Admin Forwarding Stats', method: 'GET', path: '/api/admin/forwarding/stats', auth: true },
    { name: 'Admin List Forwarding', method: 'GET', path: '/api/admin/forwarding/requests', auth: true },
    { name: 'Admin Get Forwarding Request', method: 'GET', path: '/api/admin/forwarding/requests/1', auth: true },

    // Admin - Mail
    { name: 'Admin List Mail Items', method: 'GET', path: '/api/admin/mail-items', auth: true },
    { name: 'Admin Mail Stats', method: 'GET', path: '/api/admin/mail-items/stats', auth: true },

    // Admin - Plans
    { name: 'Admin List Plans', method: 'GET', path: '/api/admin/plans', auth: true },
    { name: 'Admin Get Plan', method: 'GET', path: '/api/admin/plans/1', auth: true },

    // Admin - Billing
    { name: 'Admin Billing Metrics', method: 'GET', path: '/api/admin/billing/metrics', auth: true },

    // Companies House
    { name: 'Companies House Search', method: 'GET', path: '/api/companies-house/search?q=test', auth: true },
    { name: 'Companies House Get Company', method: 'GET', path: '/api/companies-house/12345678', auth: true },

    // Address
    { name: 'Address Lookup', method: 'GET', path: '/api/address?postcode=SW1A1AA', auth: true },

    // Blog
    { name: 'List Blog Posts', method: 'GET', path: '/api/blog/posts' },
    { name: 'Get Blog Post', method: 'GET', path: '/api/blog/posts/test-slug' },

    // KYC
    { name: 'Get KYC Status', method: 'GET', path: '/api/kyc/status', auth: true },
    { name: 'Start KYC', method: 'POST', path: '/api/kyc/start', body: {}, auth: true },

    // Email Prefs
    { name: 'Get Email Preferences', method: 'GET', path: '/api/email-prefs', auth: true },
    { name: 'Update Email Preferences', method: 'PATCH', path: '/api/email-prefs', body: { notifications: true }, auth: true },

    // Ops
    { name: 'Ops Self Test', method: 'GET', path: '/api/ops/self-test', auth: true },
];

// Run all tests
async function runAllTests() {
    log('\n🧪 Starting Comprehensive API Mock Tests\n', 'cyan');
    log(`Testing against: ${BASE_URL}\n`, 'blue');

    for (const endpoint of endpoints) {
        await testEndpoint(
            endpoint.name,
            endpoint.method,
            endpoint.path,
            {
                auth: endpoint.auth,
                body: endpoint.body,
                expectError: endpoint.expectError,
            }
        );
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 Test Summary', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`✅ Passed: ${results.passed.length}`, 'green');
    log(`❌ Failed: ${results.failed.length}`, 'red');
    log(`⏭️  Skipped: ${results.skipped.length}`, 'yellow');
    log('\n');

    // Print failed tests
    if (results.failed.length > 0) {
        log('Failed Tests:', 'red');
        results.failed.forEach(test => {
            log(`  - ${test.name} (${test.method} ${test.path})`, 'red');
            if (test.error) log(`    Error: ${test.error}`, 'yellow');
            if (test.status) log(`    Status: ${test.status}`, 'yellow');
        });
    }

    // Print passed tests (summary)
    if (results.passed.length > 0) {
        log('\nPassed Tests (first 10):', 'green');
        results.passed.slice(0, 10).forEach(test => {
            log(`  ✓ ${test.name} (${test.status})`, 'green');
        });
        if (results.passed.length > 10) {
            log(`  ... and ${results.passed.length - 10} more`, 'green');
        }
    }

    log('\n' + '='.repeat(60) + '\n', 'cyan');

    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
});

