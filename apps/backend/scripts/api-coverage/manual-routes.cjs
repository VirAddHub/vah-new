#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Normalize path for consistent matching
function normalize(p) {
    return p
        .replace(/\/+/g, '/')
        .replace(/\?.*$/, '')               // drop querystrings
        .replace(/:(\w+)/g, '{param}')      // express params
        .replace(/\{[^}]+\}/g, '{param}');  // any leftover {something} → {param}
}

// Manually enumerate routes by scanning route files
function scanRouteFiles() {
    const routes = [];
    const routesDir = path.resolve('routes');

    if (!fs.existsSync(routesDir)) {
        console.error('[manual-routes] routes directory not found');
        return [];
    }

    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

    for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract route definitions from the file
        const routeMatches = content.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi);
        if (routeMatches) {
            for (const match of routeMatches) {
                const [, method, routePath] = match.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i);
                routes.push({
                    method: method.toUpperCase(),
                    path: normalize(routePath)
                });
            }
        }
    }

    return routes;
}

// Add known routes from the API test suite
function getKnownRoutes() {
    return [
        // Health and system
        { method: 'GET', path: '/api/health' },
        { method: 'GET', path: '/api/ready' },
        { method: 'GET', path: '/api/healthz' },
        { method: 'GET', path: '/api/metrics' },

        // Auth
        { method: 'GET', path: '/api/auth/whoami' },
        { method: 'POST', path: '/api/auth/logout' },
        { method: 'GET', path: '/csrf' },

        // Profile
        { method: 'GET', path: '/api/profile' },
        { method: 'PUT', path: '/api/profile/address' },

        // Billing
        { method: 'GET', path: '/api/billing' },
        { method: 'GET', path: '/api/billing/invoices' },
        { method: 'GET', path: '/api/billing/invoices/{param}/link' },

        // Plans
        { method: 'GET', path: '/api/plans' },

        // Payments
        { method: 'GET', path: '/api/payments' },
        { method: 'GET', path: '/api/payments/subscriptions/status' },
        { method: 'POST', path: '/api/payments/redirect-flows' },

        // Mail
        { method: 'GET', path: '/api/mail-items' },
        { method: 'GET', path: '/api/mail-items/{param}' },
        { method: 'GET', path: '/api/mail-items/{param}/history' },
        { method: 'GET', path: '/api/mail-items/{param}/scan-url' },
        { method: 'GET', path: '/api/mail-search' },
        { method: 'POST', path: '/api/mail/forward' },

        // Address (new)
        { method: 'GET', path: '/api/me/address' },
        { method: 'POST', path: '/api/me/address/assign' },

        // Notifications
        { method: 'GET', path: '/api/notifications/unread' },

        // Forwarding
        { method: 'GET', path: '/api/forwarding-requests' },
        { method: 'GET', path: '/api/forwarding-requests/usage' },

        // Admin
        { method: 'GET', path: '/api/admin/users' },
        { method: 'GET', path: '/api/admin/mail-items' },
        { method: 'GET', path: '/api/admin/plans' },
        { method: 'GET', path: '/api/admin/support' },
        { method: 'GET', path: '/api/admin/invoices' },
        { method: 'PATCH', path: '/api/admin/support/{param}' },
        { method: 'PATCH', path: '/api/admin/users/{param}' },
        { method: 'PATCH', path: '/api/admin/mail-items/{param}' },
        { method: 'PATCH', path: '/api/admin/plans/{param}' },
        { method: 'PUT', path: '/api/admin/users/{param}/kyc-status' },
        { method: 'DELETE', path: '/api/admin/mail-items/{param}' },
        { method: 'POST', path: '/api/admin/mail-bulk' },

        // Support
        { method: 'POST', path: '/api/support' },

        // GDPR
        { method: 'POST', path: '/api/gdpr-export' },

        // Webhooks
        { method: 'POST', path: '/api/webhooks/sumsub' },
        { method: 'POST', path: '/api/webhooks-gc' },
        { method: 'POST', path: '/api/webhooks-postmark' },
        { method: 'GET', path: '/api/webhooks/gc' },

        // Debug
        { method: 'GET', path: '/api/debug/whoami' },
        { method: 'GET', path: '/api/debug/db-info' },

        // Downloads
        { method: 'GET', path: '/api/downloads/{param}' }
    ];
}

// Combine scanned and known routes
const scannedRoutes = scanRouteFiles();
const knownRoutes = getKnownRoutes();
const allRoutes = [...scannedRoutes, ...knownRoutes];

// Deduplicate
const unique = Array.from(new Set(allRoutes.map(r => r.method + ' ' + r.path)))
    .map(key => {
        const [method, ...rest] = key.split(' ');
        return { method, path: rest.join(' ') };
    })
    .sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

// Export function for use by other scripts
function getRoutes() {
    return unique;
}

// If run directly, write to file
if (require.main === module) {
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/api-routes.json', JSON.stringify(unique, null, 2));
    console.log(`[manual-routes] wrote reports/api-routes.json (${unique.length} routes)`);
    console.log(`[manual-routes] scanned ${scannedRoutes.length} routes from files, added ${knownRoutes.length} known routes`);
}

module.exports = { getRoutes };
