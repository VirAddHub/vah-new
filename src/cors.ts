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
        // allow server-to-server / curl / health
        if (!origin) return cb(null, true);

        // exact allowlist match
        if (staticList.includes(origin)) return cb(null, true);

        // allow ONLY this project's vercel preview URLs
        if (allowVercelPreviews) {
            try {
                const host = new URL(origin).host.toLowerCase();
                const isVercel = host.endsWith('.vercel.app');
                const isProject =
                    host === `${vercelPrefix}.vercel.app` ||
                    host.startsWith(`${vercelPrefix}-git-`);
                if (isVercel && isProject) return cb(null, true);
            } catch { }
        }

        return cb(new Error('CORS blocked'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
