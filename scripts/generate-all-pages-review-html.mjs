#!/usr/bin/env node
/**
 * Generates apps/frontend/public/all-pages-review.html — one scrollable page with iframes
 * for every app route. Open http://localhost:3000/all-pages-review.html while
 * `next dev` (or your deployed site) is running.
 *
 * The HTML output is gitignored; regenerate after route changes:
 *   node scripts/generate-all-pages-review-html.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(__dirname, '../apps/frontend/app');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, files);
    else if (name.name === 'page.tsx') files.push(p);
  }
  return files;
}

/** Turn filesystem path under app/ to URL path */
function pagePathToUrl(relFromApp) {
  const parts = relFromApp.split(path.sep).filter(Boolean);
  if (parts[parts.length - 1] === 'page.tsx') parts.pop();
  const segs = [];
  for (const seg of parts) {
    if (seg.startsWith('(') && seg.endsWith(')')) continue;
    if (seg.startsWith('[') && seg.endsWith(']')) {
      const inner = seg.slice(1, -1);
      if (inner === 'slug') segs.push('welcome');
      else if (inner === 'id') segs.push('1');
      else segs.push('placeholder');
    } else segs.push(seg);
  }
  const u = '/' + segs.join('/');
  return u === '/' ? '/' : u.replace(/\/+/g, '/');
}

const pages = walk(APP).sort();
const routes = [...new Set(pages.map((f) => pagePathToUrl(path.relative(APP, f))))];

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

const sections = routes
  .map(
    (route) => `
    <section class="route" id="${esc(route.replace(/[^a-zA-Z0-9_-]/g, '_'))}">
      <header class="route-head">
        <h2><code>${esc(route)}</code></h2>
        <a class="open-tab" href="${esc(route)}" target="_blank" rel="noopener">Open alone</a>
      </header>
      <div class="frame-wrap">
        <iframe title="${esc(route)}" src="${esc(route)}" loading="lazy"></iframe>
      </div>
    </section>`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>All pages — VirtualAddressHub (iframe preview)</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e6edf3;
      --muted: #8b9cb3;
      --accent: #3fb950;
      --border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .banner {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 1rem 1.25rem;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 4px 24px rgba(0,0,0,.35);
    }
    .banner h1 { margin: 0 0 0.35rem; font-size: 1.15rem; font-weight: 600; }
    .banner p { margin: 0; font-size: 0.875rem; color: var(--muted); max-width: 72ch; }
    .banner code { color: var(--accent); }
    .toc {
      padding: 1rem 1.25rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .toc h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 0.75rem; }
    .toc ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
    }
    .toc a {
      font-size: 0.8125rem;
      color: var(--accent);
      text-decoration: none;
    }
    .toc a:hover { text-decoration: underline; }
    .route {
      max-width: 1200px;
      margin: 0 auto 2.5rem;
      padding: 0 1.25rem;
    }
    .route-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .route-head h2 { margin: 0; font-size: 0.95rem; font-weight: 500; }
    .route-head code { color: var(--accent); background: var(--panel); padding: 0.2rem 0.45rem; border-radius: 4px; }
    .open-tab {
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .open-tab:hover { color: var(--text); }
    .frame-wrap {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      min-height: 420px;
    }
    iframe {
      display: block;
      width: 100%;
      height: min(85vh, 900px);
      border: none;
    }
  </style>
</head>
<body>
  <div class="banner">
    <h1>All routes (live preview)</h1>
    <p>
      Served from the same origin as this file so each iframe loads the real Next.js page with its CSS.
      Use <code>npm run dev</code> in <code>apps/frontend</code>, then open
      <code>http://localhost:3000/all-pages-review.html</code>.
      Dynamic segments use placeholders (e.g. blog slug). Auth pages may redirect or show login.
    </p>
  </div>
  <nav class="toc" aria-label="Jump to route">
    <h2>Jump to</h2>
    <ul>
${routes
  .map(
    (r) =>
      `      <li><a href="#${esc(r.replace(/[^a-zA-Z0-9_-]/g, '_'))}">${esc(r)}</a></li>`
  )
  .join('\n')}
    </ul>
  </nav>
  <main>
${sections}
  </main>
</body>
</html>
`;

const out = path.join(__dirname, '../apps/frontend/public/all-pages-review.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`Wrote ${out} (${routes.length} routes)`);
