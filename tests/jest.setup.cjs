// Jest setup to handle fetch and ESM modules
// Use Node 20 built-in fetch if not present
if (typeof global.fetch !== 'function') {
    try {
        const { fetch, Headers, Request, Response, FormData, File, Blob } = require('undici');
        Object.assign(global, { fetch, Headers, Request, Response, FormData, File, Blob });
    } catch (e) {
        // Fallback to node-fetch if undici not available
        const fetch = require('node-fetch');
        global.fetch = fetch;
    }
}

// Set consistent environment for tests
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
process.env.HOURLY_EXPORTS_ENABLED = 'false';
process.env.DEBUG_ROUTES = 'true';
process.env.NODE_ENV = 'test';

// Optional: silence URL warnings during tests
process.env.APP_ORIGIN ||= 'http://localhost:3000';
process.env.BACKEND_API_ORIGIN ||= 'http://localhost:10000';
