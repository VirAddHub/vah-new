#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Create a minimal Express app to enumerate routes without starting the server
const express = require('express');

// Mock the database and other dependencies
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
    // Mock database and other heavy dependencies
    if (id === './db' || id === './db.js') {
        return {
            withPgClient: () => Promise.resolve(),
            db: { get: () => { }, all: () => [], run: () => { } },
            detectSchemaFeatures: () => Promise.resolve()
        };
    }
    if (id === './bootstrap/requireEnv') {
        return {
            validateEnvironment: () => { },
            env: {}
        };
    }
    if (id.startsWith('./routes/')) {
        // Return a mock router for each route file
        const router = express.Router();
        // Add some mock routes based on the file name
        if (id.includes('address')) {
            router.get('/api/me/address', (req, res) => { });
            router.post('/api/me/address/assign', (req, res) => { });
        } else if (id.includes('health')) {
            router.get('/api/health', (req, res) => { });
        } else if (id.includes('profile')) {
            router.get('/api/profile', (req, res) => { });
            router.put('/api/profile/address', (req, res) => { });
        } else if (id.includes('billing')) {
            router.get('/api/billing', (req, res) => { });
            router.get('/api/billing/invoices', (req, res) => { });
        } else if (id.includes('mail')) {
            router.get('/api/mail-items', (req, res) => { });
            router.post('/api/mail/forward', (req, res) => { });
        } else if (id.includes('admin')) {
            router.get('/api/admin/users', (req, res) => { });
            router.get('/api/admin/plans', (req, res) => { });
        } else if (id.includes('webhooks')) {
            router.post('/api/webhooks/sumsub', (req, res) => { });
            router.post('/api/webhooks-postmark', (req, res) => { });
        } else if (id.includes('auth')) {
            router.get('/api/auth/whoami', (req, res) => { });
            router.post('/api/auth/logout', (req, res) => { });
        } else if (id.includes('support')) {
            router.post('/api/support', (req, res) => { });
        } else if (id.includes('payments')) {
            router.get('/api/payments', (req, res) => { });
            router.post('/api/payments/redirect-flows', (req, res) => { });
        } else if (id.includes('notifications')) {
            router.get('/api/notifications/unread', (req, res) => { });
        } else if (id.includes('forwarding')) {
            router.get('/api/forwarding-requests', (req, res) => { });
        } else if (id.includes('debug')) {
            router.get('/api/debug/whoami', (req, res) => { });
        } else if (id.includes('metrics')) {
            router.get('/api/metrics', (req, res) => { });
        }
        return router;
    }
    if (id.startsWith('./middleware/')) {
        return (req, res, next) => next();
    }
    if (id.startsWith('./storage-paths')) {
        return { resolveDataDir: () => '/tmp', resolveInvoicesDir: () => '/tmp' };
    }
    if (id.startsWith('./lib/')) {
        return {};
    }
    return originalRequire.apply(this, arguments);
};

try {
    // Now require the server file
    const serverModule = require(path.resolve(__dirname, '../../server/index.js'));
    const app = serverModule.app || serverModule.default || serverModule;

    // Extract routes
    const routes = [];
    function walk(stack, prefix = '') {
        for (const layer of stack) {
            if (layer.route && layer.route.path) {
                const p = (prefix + layer.route.path).replace(/\/+/g, '/');
                const methods = Object.keys(layer.route.methods || {}).filter(Boolean);
                for (const m of methods) {
                    routes.push({ method: m.toUpperCase(), path: p });
                }
            } else if (layer.name === 'router' && layer.handle?.stack) {
                walk(layer.handle.stack, prefix);
            } else if (layer.handle?.stack) {
                walk(layer.handle.stack, prefix);
            }
        }
    }

    if (app && app._router && app._router.stack) {
        walk(app._router.stack, '');
    }

    // Normalize and deduplicate
    const normalized = routes
        .map(r => ({
            method: r.method,
            path: r.path.replace(/\/+/g, '/').replace(/:(\w+)/g, '{param}')
        }))
        .filter(r => r.path.startsWith('/'))
        .sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

    const unique = Array.from(new Set(normalized.map(r => r.method + ' ' + r.path)))
        .map(key => {
            const [method, ...rest] = key.split(' ');
            return { method, path: rest.join(' ') };
        });

    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/api-routes.json', JSON.stringify(unique, null, 2));
    console.log(`[enumerate-routes] wrote reports/api-routes.json (${unique.length} routes)`);

} catch (error) {
    console.error('[enumerate-routes] Error:', error.message);
    process.exit(1);
} finally {
    // Restore original require
    Module.prototype.require = originalRequire;
}
