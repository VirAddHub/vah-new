const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const targets = [];

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.git')) continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (exts.has(path.extname(name))) targets.push(p);
    }
}
walk(ROOT);

const re1 = /\berror:\s*error\.message\b/g;
const re2 = /\bconst\s+message\s*=\s*error\.message\b/g;

let changed = 0;
for (const f of targets) {
    let s = fs.readFileSync(f, 'utf8');
    const before = s;
    s = s.replace(re1, 'error_message: getErrorMessage(error), stack: getErrorStack(error)');
    s = s.replace(re2, 'const message = getErrorMessage(error)');
    if (s !== before) {
        // ensure import exists
        if (!/from\s+["']@\/lib\/errors["']/.test(s) && /getErrorMessage|getErrorStack/.test(s)) {
            const hasReact = /from\s+["']react["']/.test(s);
            const importLine = `import { getErrorMessage, getErrorStack } from "@/lib/errors";\n`;
            s = importLine + s;
        }
        fs.writeFileSync(f, s);
        changed++;
        console.log('fixed:', f);
    }
}
console.log(`Done. Updated ${changed} files.`);
