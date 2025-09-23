#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const reportPath = 'reports/api-routes.json';
const outDir = 'tests/smoke';
fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(reportPath)) {
    console.error('[gen-smoke] reports/api-routes.json not found. Run npm run api:coverage first.');
    process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Don't generate destructive tests yet
const SKIP_METHOD = new Set(['DELETE', 'PUT', 'PATCH', 'POST']);

function fileNameFor(group) {
    return path.join(outDir, `${group}.spec.js`);
}

const groups = {};
for (const r of routes) {
    const seg1 = r.path.split('/').filter(Boolean)[0] || 'root';
    const g = seg1.replace(/[^a-z0-9_-]/gi, '_');
    groups[g] ||= [];
    groups[g].push(r);
}

for (const [g, rs] of Object.entries(groups)) {
    const f = fileNameFor(g);
    if (fs.existsSync(f)) {
        console.log('[gen-smoke] skipping existing', f);
        continue;
    }

    const body = `// AUTO-GENERATED SMOKE for group: ${g}
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] ${g}', () => {
${rs.map(r => {
        const method = r.method.toLowerCase();
        const samplePath = r.path.replace('{param}', 'test-id');
        const skip = SKIP_METHOD.has(r.method) ? '.skip' : '';
        return `
  test${skip}('${r.method} ${r.path}', async () => {
    const res = await request(app)[\`${method}\`](\`${samplePath}\`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });`;
    }).join('\n')}
});
`;
    fs.writeFileSync(f, body, 'utf8');
    console.log('[gen-smoke] wrote', f);
}

console.log(`[gen-smoke] generated ${Object.keys(groups).length} smoke test files`);
