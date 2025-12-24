/**
 * Mock API Server for Testing
 * Simulates all backend endpoints with realistic mock responses
 */

const http = require('http');
const url = require('url');

const PORT = 3002; // Different port to avoid conflicts

// Mock data
const mocks = {
    user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        plan_id: 1,
    },
    mailItems: [
        { id: 1, subject: 'Test Mail 1', from: 'sender1@example.com', received_at: Date.now() },
        { id: 2, subject: 'Test Mail 2', from: 'sender2@example.com', received_at: Date.now() - 86400000 },
    ],
    forwardingRequests: [
        { id: 1, to_name: 'John Doe', status: 'requested', created_at: Date.now() },
        { id: 2, to_name: 'Jane Smith', status: 'dispatched', dispatched_at: Date.now() - 3600000 },
    ],
    plans: [
        { id: 1, name: 'Monthly', price: 9.99, billing_cycle: 'monthly' },
        { id: 2, name: 'Annual', price: 89.99, billing_cycle: 'annual' },
    ],
    invoices: [
        { id: 1, amount: 999, status: 'paid', created_at: Date.now() - 86400000 },
        { id: 2, amount: 999, status: 'paid', created_at: Date.now() - 172800000 },
    ],
    adminOverview: {
        users: { total: 100, active: 75, kycPending: 5, deleted: 2 },
        mail: { total: 500, processedLast30Days: 150 },
        forwarding: { active: 25, requested: 10, dispatched: 15 },
        revenue: { currentMonth: 50000, lastMonth: 45000, delta: 11 },
    },
};

// Route handlers
const routes = {
    // Health
    'GET /api/health': () => ({ ok: true, status: 'healthy', timestamp: Date.now() }),
    'GET /api/healthz': () => ({ ok: true }),
    'GET /api/__version': () => ({ builtAt: new Date().toISOString(), commit: 'test', branch: 'main' }),
    'GET /api/metrics': () => '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100\n',

    // Auth
    'GET /api/auth/whoami': (req) => {
        if (req.headers.authorization) {
            return { ok: true, user: mocks.user };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'POST /api/auth/login': (req, body) => {
        if (body.email && body.password) {
            return { ok: true, token: 'mock-jwt-token', user: mocks.user };
        }
        return { ok: false, error: 'Invalid credentials' };
    },
    'POST /api/auth/register': (req, body) => {
        if (body.email && body.password) {
            return { ok: true, user: { ...mocks.user, email: body.email } };
        }
        return { ok: false, error: 'Invalid input' };
    },
    'POST /api/auth/logout': () => ({ ok: true }),

    // Profile
    'GET /api/profile': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.user };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'PATCH /api/profile': (req, body) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.user, ...body };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Mail
    'GET /api/mail-items': (req) => {
        if (req.headers.authorization) {
            return { ok: true, items: mocks.mailItems, total: mocks.mailItems.length };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/mail-items/1': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.mailItems[0] };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'PATCH /api/mail-items/1': (req, body) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.mailItems[0], ...body };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'DELETE /api/mail-items/1': (req) => {
        if (req.headers.authorization) {
            return { ok: true };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Forwarding
    'GET /api/forwarding/requests': (req) => {
        if (req.headers.authorization) {
            return { ok: true, requests: mocks.forwardingRequests };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'POST /api/forwarding/requests': (req, body) => {
        if (req.headers.authorization) {
            return { ok: true, id: 3, ...body, status: 'requested' };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Billing
    'GET /api/billing/overview': (req) => {
        if (req.headers.authorization) {
            return { ok: true, subscription: { plan_id: 1, status: 'active' }, invoices: mocks.invoices };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/billing/invoices': (req) => {
        if (req.headers.authorization) {
            return { ok: true, invoices: mocks.invoices };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/billing/subscription-status': (req) => {
        if (req.headers.authorization) {
            return { ok: true, status: 'active', plan_id: 1 };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Plans
    'GET /api/plans': () => ({ ok: true, plans: mocks.plans }),
    'GET /api/plans/1': () => ({ ok: true, ...mocks.plans[0] }),

    // Contact & Support
    'POST /api/contact': (req, body) => {
        if (body.name && body.email && body.message) {
            return { ok: true, message: 'Contact form submitted' };
        }
        return { ok: false, error: 'Invalid input' };
    },
    'GET /api/support/info': () => ({ ok: true, email: 'support@example.com', phone: '+44 20 1234 5678' }),

    // Quiz
    'POST /api/quiz/submit': (req, body) => {
        if (body.name && body.email) {
            return { ok: true, score: 75, segment: 'high' };
        }
        return { ok: false, error: 'Invalid input' };
    },
    'GET /api/quiz/stats': () => ({ ok: true, total: 100, averageScore: 72 }),

    // Admin - Overview
    'GET /api/admin/overview': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.adminOverview };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/health/summary': (req) => {
        if (req.headers.authorization) {
            return { ok: true, status: 'healthy', uptime: 3600 };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/health/dependencies': (req) => {
        if (req.headers.authorization) {
            return { ok: true, database: 'connected', postmark: 'connected' };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/activity': (req) => {
        if (req.headers.authorization) {
            return {
                ok: true, activities: [
                    { id: 1, type: 'user_signup', at: Date.now(), title: 'New user signed up' },
                    { id: 2, type: 'mail_received', at: Date.now() - 3600000, title: 'Mail received' },
                ]
            };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Admin - Users
    'GET /api/admin/users': (req) => {
        if (req.headers.authorization) {
            return { ok: true, users: [mocks.user], total: 1, page: 1, pageSize: 50 };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/users/1': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.user };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'PATCH /api/admin/users/1': (req, body) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.user, ...body };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/users/stats': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.adminOverview.users };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Admin - Forwarding
    'GET /api/admin/forwarding/stats': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.adminOverview.forwarding };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/forwarding/requests': (req) => {
        if (req.headers.authorization) {
            return { ok: true, requests: mocks.forwardingRequests };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/forwarding/requests/1': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.forwardingRequests[0] };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Admin - Mail
    'GET /api/admin/mail-items': (req) => {
        if (req.headers.authorization) {
            return { ok: true, items: mocks.mailItems, total: mocks.mailItems.length };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/mail-items/stats': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.adminOverview.mail };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Admin - Plans
    'GET /api/admin/plans': (req) => {
        if (req.headers.authorization) {
            return { ok: true, plans: mocks.plans };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/admin/plans/1': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.plans[0] };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Admin - Billing
    'GET /api/admin/billing/metrics': (req) => {
        if (req.headers.authorization) {
            return { ok: true, ...mocks.adminOverview.revenue };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Companies House
    'GET /api/companies-house/search': (req) => {
        if (req.headers.authorization) {
            return { ok: true, companies: [{ name: 'Test Company', number: '12345678' }] };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'GET /api/companies-house/12345678': (req) => {
        if (req.headers.authorization) {
            return { ok: true, name: 'Test Company', number: '12345678' };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Address
    'GET /api/address': (req) => {
        if (req.headers.authorization) {
            return { ok: true, addresses: [{ address1: '123 Test St', city: 'London', postal: 'SW1A 1AA' }] };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Blog
    'GET /api/blog/posts': () => ({ ok: true, posts: [{ slug: 'test-post', title: 'Test Post' }] }),
    'GET /api/blog/posts/test-slug': () => ({ ok: true, slug: 'test-slug', title: 'Test Post', content: 'Test content' }),

    // KYC
    'GET /api/kyc/status': (req) => {
        if (req.headers.authorization) {
            return { ok: true, status: 'pending' };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'POST /api/kyc/start': (req) => {
        if (req.headers.authorization) {
            return { ok: true, kyc_url: 'https://kyc.example.com/start' };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Email Prefs
    'GET /api/email-prefs': (req) => {
        if (req.headers.authorization) {
            return { ok: true, notifications: true, marketing: false };
        }
        return { ok: false, error: 'Unauthorized' };
    },
    'PATCH /api/email-prefs': (req, body) => {
        if (req.headers.authorization) {
            return { ok: true, notifications: true, ...body };
        }
        return { ok: false, error: 'Unauthorized' };
    },

    // Ops
    'GET /api/ops/self-test': (req) => {
        if (req.headers.authorization) {
            return { ok: true, tests: [{ name: 'Database', status: 'pass' }] };
        }
        return { ok: false, error: 'Unauthorized' };
    },
};

// Server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const routeKey = `${method} ${path}`;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Find matching route
    let handler = routes[routeKey];

    // Try pattern matching for dynamic routes
    if (!handler) {
        for (const [key, value] of Object.entries(routes)) {
            const [routeMethod, routePath] = key.split(' ');
            if (routeMethod === method) {
                // Match patterns like /api/mail-items/:id
                const pattern = routePath.replace(/\/\d+/g, '/\\d+').replace(/\//g, '\\/');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) {
                    handler = value;
                    break;
                }
            }
        }
    }

    // Read body for POST/PATCH/PUT
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        let parsedBody = {};
        try {
            if (body) parsedBody = JSON.parse(body);
        } catch (e) {
            // Ignore parse errors
        }

        if (handler) {
            const response = handler(req, parsedBody);
            const statusCode = response.ok !== false ? 200 : (response.error === 'Unauthorized' ? 401 : 400);
            res.writeHead(statusCode);
            res.end(JSON.stringify(response));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ ok: false, error: 'Not found', route: routeKey }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Mock API Server running on http://localhost:${PORT}`);
    console.log(`📋 Testing ${Object.keys(routes).length} endpoints\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down mock server...');
    server.close(() => {
        console.log('✅ Mock server closed');
        process.exit(0);
    });
});

