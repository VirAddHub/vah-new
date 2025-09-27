#!/usr/bin/env node
const fs = require('fs');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function keyOf(r) { return r.method + ' ' + r.path; }

const routes = load('reports/api-routes.json');
const tested = load('reports/api-tested.json');

const routeSet = new Set(routes.map(keyOf));
const testedSet = new Set(tested.map(keyOf));

const untested = routes.filter(r => !testedSet.has(keyOf(r)));
const orphaned = tested.filter(t => !routeSet.has(keyOf(t))); // tests hitting removed paths

const summary = {
    total_routes: routes.length,
    total_tested: tested.length,
    coverage_percent: routes.length ? Math.round(100 * (routes.length - untested.length) / routes.length) : 0,
    untested_count: untested.length,
    orphaned_count: orphaned.length,
    untested,
    orphaned
};

console.log(JSON.stringify(summary, null, 2));
