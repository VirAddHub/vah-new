#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const serverDir = path.join(root, 'dist', 'src');
const shimDir = path.join(serverDir, 'server');
const libShimDir = path.join(serverDir, 'lib');

try {
    if (!fs.existsSync(serverDir)) {
        console.error('[shims] dist/server not found; build first');
        process.exit(0);
    }

    // Create shim directories
    fs.mkdirSync(shimDir, { recursive: true });
    fs.mkdirSync(libShimDir, { recursive: true });

    // Create server/db.js shim
    const dbShim = `// auto-generated shim so routes requiring '../server/db' work under dist/server/routes
module.exports = require('../src/lib/db');
`;
    fs.writeFileSync(path.join(serverDir, 'db.js'), dbShim);
    console.log('[shims] wrote', path.relative(root, path.join(serverDir, 'db.js')));

    // Create lib/*.js shims for common modules
    const libModules = [
        'metrics', 'metrics-forwarding', 'notify', 'gdpr-export',
        'token', 'mailer', 'sumsub'
    ];

    for (const module of libModules) {
        const shimContent = `// auto-generated shim so routes requiring '../lib/${module}' work under dist/server/routes
module.exports = require('../../lib/${module}');
`;
        fs.writeFileSync(path.join(serverDir, `${module}.js`), shimContent);
        console.log('[shims] wrote', path.relative(root, path.join(serverDir, `${module}.js`)));
    }

} catch (e) {
    console.error('[shims] failed:', e?.message || e);
    process.exit(1);
}
