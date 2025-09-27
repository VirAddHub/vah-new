// server/storage-paths.js
const path = require('path');
const fs = require('fs');

function ensureDir(p) {
    try { fs.mkdirSync(p, { recursive: true }); } catch { }
}

function resolveDataDir() {
    // ENV first (Render: /var/data). Fallback: project-local dist/data
    const dir = process.env.DATA_DIR || path.resolve(process.cwd(), 'dist/data');
    ensureDir(dir);
    return dir;
}

function resolveInvoicesDir() {
    const base = resolveDataDir();
    const dir = process.env.INVOICES_DIR || path.join(base, 'invoices');
    ensureDir(dir);
    return dir;
}

module.exports = { resolveDataDir, resolveInvoicesDir };
