#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function globFiles(dir, suffixes = ['.test.js', '.spec.js', '.test.ts', '.spec.ts']) {
    const out = [];
    function walk(p) {
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            for (const n of fs.readdirSync(p)) walk(path.join(p, n));
        } else {
            const name = path.basename(p);
            if (suffixes.some(s => name.endsWith(s))) out.push(p);
        }
    }
    if (fs.existsSync(dir)) walk(dir);
    return out;
}

function parseEndpointsFromFile(p) {
    const src = fs.readFileSync(p, 'utf8');
    const hits = [];
    // capture supertest-like usages: request(app).get('/x'), .post("/y"), fetch('/z') etc.
    const re = /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gi;
    let m;
    while ((m = re.exec(src))) {
        hits.push({ method: m[1].toUpperCase(), path: normalize(expandTemplates(m[2])) });
    }
    // also capture explicit fetch calls: fetch('.../api/...',{method:'POST'})
    const rf = /fetch\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{[^}]*method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/gi;
    while ((m = rf.exec(src))) {
        const url = m[1];
        const method = m[2].toUpperCase();
        const path = url.replace(/^https?:\/\/[^/]+/i, ''); // strip host
        if (path.startsWith('/')) hits.push({ method, path: normalize(expandTemplates(path)) });
    }
    return hits;
}

function expandTemplates(p) {
    // turn `/api/foo/${id}/bar` or `/api/foo/${anything}` into `/api/foo/{param}/bar`
    return p.replace(/\$\{[^}]+\}/g, '{param}');
}

function normalize(p) {
    return p
        .replace(/\/+/g, '/')
        .replace(/\?.*$/, '')               // drop querystrings
        .replace(/:(\w+)/g, '{param}')      // express params
        .replace(/\{[^}]+\}/g, '{param}');  // any leftover {something} → {param}
}

const testDirs = ['tests', '__tests__'];
let files = [];
for (const d of testDirs) if (fs.existsSync(d)) files = files.concat(globFiles(d));

const endpoints = files.flatMap(parseEndpointsFromFile);
const unique = Array.from(new Set(endpoints.map(r => r.method + ' ' + r.path)))
    .map(key => {
        const [method, ...rest] = key.split(' ');
        return { method, path: rest.join(' ') };
    }).sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/api-tested.json', JSON.stringify(unique, null, 2));
console.log(`[list-tested] scanned ${files.length} test files; wrote reports/api-tested.json (${unique.length} endpoints)`);
