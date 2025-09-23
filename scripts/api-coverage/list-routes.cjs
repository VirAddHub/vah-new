#!/usr/bin/env node
/* eslint-disable */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
process.env.DEBUG_ROUTES = '1';

const fs = require('fs');
const path = require('path');

function normalizePath(p) {
    return String(p)
        .replace(/:([A-Za-z0-9_]+)/g, '{param}')
        .replace(/\${[^}]+}/g, '{param}')
        .replace(/\/\d+(\b|\/)/g, '/{param}$1')
        .replace(/\/+/g, '/');
}

function collect(app) {
    const out = [];
    const visit = (stack, prefix = '') => {
        for (const layer of stack || []) {
            if (layer.route?.path) {
                const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
                for (const m of methods) out.push({ method: m, path: normalizePath(prefix + layer.route.path) });
            } else if (layer.name === 'router' && layer.handle?.stack) {
                const base = layer.regexp?.fast_slash ? prefix : prefix + (layer.regexp?.source?.includes('\\/?') ? '' : '');
                visit(layer.handle.stack, base);
            }
        }
    };
    // Try both possible router locations
    const stack = app._router?.stack || app.router?.stack || [];
    visit(stack);
    return out;
}

function write(out) {
    const dest = path.join(process.cwd(), 'reports', 'api-routes.json');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(out, null, 2));
    console.log(`[list-routes] wrote ${dest} (${out.length} routes)`);
}

(async () => {
    try {
        // Get the app instance (DO NOT call it as a function)
        const { app } = require('../../server/index.js');
        const expressApp = app; // app is already the Express instance

        const routes = collect(expressApp);
        if (routes.length > 0) {
            console.log('[list-routes] Using app-based route enumeration...');
            return write(routes);
        }
        throw new Error('Empty stack');
    } catch (e) {
        console.log('[list-routes] App-based enumeration failed:', e.message);
        // fallback to manual file (your working path)
        console.log('[list-routes] Using manual route enumeration...');
        const { getRoutes } = require('./manual-routes.cjs');
        const routes = getRoutes();
        console.log(`[list-routes] Manual routes count: ${routes.length}`);
        return write(routes);
    }
})();
