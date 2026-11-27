// The full registered address is released only by the API, to customers in full service.
// It must never be built into browser code or returned by the website's own API routes as a fallback.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
function files(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files(p, out);
        else if (/\.(tsx?|jsx?|html|css|json)$/.test(e.name)) out.push(p);
    }
    return out;
}
const source = ['app', 'components', 'lib', 'hooks', 'contexts', 'public']
    .filter((d) => fs.existsSync(path.join(root, d)))
    .flatMap((d) => files(path.join(root, d)));

describe('registered address release', () => {
    it('appears only in the server-only config', () => {
        const hits = source.filter((f) => /Tanner|SE1\s*3PH/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
        expect(hits).toEqual(['lib/config/address.ts']);
    });
    it('the config cannot be imported into browser code', () => {
        expect(fs.readFileSync(path.join(root, 'lib/config/address.ts'), 'utf8')).toMatch(/^import "server-only";/);
    });
    it('no page, component or website API route reads the config', () => {
        const importers = source.filter((f) => /lib\/config\/address/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
        expect(importers).toEqual([]);
    });
});
