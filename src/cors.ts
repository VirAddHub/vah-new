import * as cors from 'cors';
import { URL } from 'node:url';

const allowlist = [
    'https://vah-frontend-final.vercel.app',
    'http://localhost:3000',
];

// Allow preview URLs (startsWith)
function isAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (allowlist.includes(origin)) return true;
    if (origin.startsWith('https://vah-frontend-final-') && origin.includes('.vercel.app')) return true;
    return false;
}

// Add environment variable support for additional origins
if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    allowlist.push(...additionalOrigins);
}

export const corsMiddleware = cors({
    origin(origin, cb) {
        console.log('[CORS] Checking origin:', origin);
        if (isAllowed(origin)) {
            console.log('[CORS] Origin allowed:', origin);
            return cb(null, true);
        }
        console.log('[CORS] Origin rejected:', origin);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Accept','Authorization','X-CSRF-Token','X-Requested-With','Cache-Control','Pragma'],
    exposedHeaders: ['Content-Disposition'],
});
