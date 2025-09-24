import * as cors from 'cors';
import { URL } from 'node:url';

const staticList = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const allowVercelPreviews = (process.env.ALLOW_VERCEL_PREVIEWS ?? '').toLowerCase() === 'true';
const vercelPrefix = (process.env.VERCEL_PROJECT_PREFIX ?? '').toLowerCase();

export const corsMiddleware = cors({
    origin(origin, cb) {
        // Debug logging
        console.log('[CORS] Checking origin:', origin);
        console.log('[CORS] Allowed origins:', staticList);
        console.log('[CORS] Allow Vercel previews:', allowVercelPreviews);
        console.log('[CORS] Vercel prefix:', vercelPrefix);

        // allow server-to-server / curl / health
        if (!origin) return cb(null, true);

        // exact allowlist match
        if (staticList.includes(origin)) {
            console.log('[CORS] Origin allowed by static list');
            return cb(null, true);
        }

        // allow ONLY this project's vercel preview URLs
        if (allowVercelPreviews) {
            try {
                const host = new URL(origin).host.toLowerCase();
                const isVercel = host.endsWith('.vercel.app');
                const isProject =
                    host === `${vercelPrefix}.vercel.app` ||
                    host.startsWith(`${vercelPrefix}-git-`);
                if (isVercel && isProject) {
                    console.log('[CORS] Origin allowed by Vercel preview');
                    return cb(null, true);
                }
            } catch (e) {
                console.log('[CORS] Error parsing Vercel origin:', e.message);
            }
        }

        console.log('[CORS] Origin blocked');
        return cb(new Error('CORS blocked'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
