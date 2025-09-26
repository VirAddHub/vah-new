// server/utils/printRoutes.ts
import type { Application } from 'express';

export function printRoutes(app: any) {
    const out: string[] = [];
    app._router?.stack?.forEach((layer: any) => {
        if (layer.route) {
            const m = Object.keys(layer.route.methods).map((x) => x.toUpperCase()).join(',');
            out.push(`${m.padEnd(8)} ${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle?.stack) {
            const base = (layer.regexp?.toString() || '')
                .replace(/^\/\^\(\?:\\\/\)\?\(\?:\(\?\=\\\/\|\$\)\)\/i$/, '/')
                .replace(/^\/\^\(\?:\\\/\)\?/, '/')
                .replace(/\\\//g, '/')
                .replace(/\.\*\?\)\/i$/, '');
            layer.handle.stack.forEach((h: any) => {
                if (h.route) {
                    const m = Object.keys(h.route.methods).map((x) => x.toUpperCase()).join(',');
                    out.push(`${m.padEnd(8)} ${base}${h.route.path}`);
                }
            });
        }
    });
    console.log('=== ROUTES MOUNTED ===');
    out.sort().forEach((x) => console.log(x));
    console.log('======================');
}
