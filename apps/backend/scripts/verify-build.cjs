// apps/backend/scripts/verify-build.cjs
const fs = require('fs');
const path = require('path');

function mustExist(p) {
    try {
        fs.accessSync(p);
        console.log('[verify-build] OK:', p);
    } catch (e) {
        console.error('[verify-build] MISSING:', p);
        process.exit(1);
    }
}

const root = path.join(__dirname, '..', 'dist', 'server', 'routes');
mustExist(path.join(root, 'public', 'plans.js'));

// Optional: show tree to help Render logs
try {
    const list = fs.readdirSync(path.join(root, 'public'));
    console.log('[verify-build] routes/public contents:', list);
} catch (e) {
    console.warn('[verify-build] cannot list routes/public:', e.message);
}
