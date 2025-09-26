// Non-secret guard for CI. Fails if example files are missing expected keys.
import fs from 'fs';

const mustHaveServer = [
    'DATA_DIR', 'INVOICES_DIR', 'BACKUPS_DIR', 'COOKIE_SECRET',
    'POSTMARK_API_TOKEN', 'POSTMARK_FROM', 'GO_CARDLESS_SECRET', 'SUMSUB_SECRET',
    'COMPANIES_HOUSE_API_KEY', 'ADDRESS_API_KEY', 'GETADDRESS_API_KEY', 'INVOICE_LINK_TTL_USER_MIN', 'INVOICE_LINK_TTL_ADMIN_MIN'
];
const mustHaveApp = ['NEXT_PUBLIC_BASE_URL', 'BACKEND_API_ORIGIN', 'GETADDRESS_API_KEY'];

function parseExample(p) {
    if (!fs.existsSync(p)) throw new Error(`${p} not found`);
    const txt = fs.readFileSync(p, 'utf8');
    const keys = new Set(
        txt.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'))
            .map(l => l.split('=')[0])
    );
    return keys;
}

const serverKeys = parseExample('server/env.example');
const appKeys = parseExample('app/env.example');

const missServer = mustHaveServer.filter(k => !serverKeys.has(k));
const missApp = mustHaveApp.filter(k => !appKeys.has(k));

if (missServer.length || missApp.length) {
    console.error('Missing keys in env examples:', { server: missServer, app: missApp });
    process.exit(1);
}
console.log('Env examples OK');
