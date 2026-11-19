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

const root = path.join(__dirname, '..', 'dist', 'src', 'server', 'routes');
mustExist(path.join(root, 'public', 'plans.js'));

// Optional: show tree to help Render logs
try {
    const list = fs.readdirSync(path.join(root, 'public'));
    console.log('[verify-build] routes/public contents:', list);
} catch (e) {
    console.warn('[verify-build] cannot list routes/public:', e.message);
}

// The compiled mailer must build a real Postmark client. A default import of 'postmark' passes
// type checks and mocked unit tests but is undefined in the compiled CommonJS output, which
// silently stopped every templated email on staging (19 Nov 2026). Runs without sending anything.
try {
    const saved = { token: process.env.POSTMARK_TOKEN, transport: process.env.MAIL_TRANSPORT };
    process.env.POSTMARK_TOKEN = 'verify-build-not-a-real-token';
    delete process.env.MAIL_TRANSPORT;
    const { getClient } = require(path.join(__dirname, '..', 'dist', 'src', 'lib', 'mailer.js'));
    const client = getClient();
    if (!client || typeof client.sendEmailWithTemplate !== 'function') throw new Error('getClient() did not return a Postmark client');
    if (saved.token === undefined) delete process.env.POSTMARK_TOKEN; else process.env.POSTMARK_TOKEN = saved.token;
    if (saved.transport !== undefined) process.env.MAIL_TRANSPORT = saved.transport;
    console.log('[verify-build] OK: mailer builds a Postmark client');
} catch (e) {
    console.error('[verify-build] MAILER BROKEN:', e && e.message ? e.message : e);
    process.exit(1);
}
