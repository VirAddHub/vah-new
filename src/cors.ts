import * as cors from 'cors';
import { URL } from 'node:url';

const allowlist = new Set([
    'https://vah-frontend-final.vercel.app',
    'http://localhost:3000',
]);

// Allow Vercel preview: https://vah-frontend-final-*.vercel.app
function isAllowed(origin: string | undefined): boolean {
    if (!origin) return true; // allow same-origin / server-to-server
    if (allowlist.has(origin)) return true;
    if (/^https:\/\/vah-frontend-final-[\w-]+\.vercel\.app$/.test(origin)) return true;
    return false;
}

if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)) {
        allowlist.add(o);
    }
}

export const corsOptions = {
    origin(origin, cb) {
        if (isAllowed(origin)) return cb(null, origin || true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Disposition'],
};

export const corsMiddleware = cors(corsOptions);

// CORS Debug middleware (behind env flag)
export const corsDebugMiddleware = (req: any, res: any, next: any) => {
    if (process.env.CORS_DEBUG !== '1') {
        return next();
    }

    const originalSend = res.send;
    const originalJson = res.json;

    // Log request details
    console.log('[CORS_DEBUG] Request:', {
        method: req.method,
        url: req.originalUrl,
        origin: req.headers.origin
    });

    // Override response methods to log headers after response
    res.send = function (data: any) {
        console.log('[CORS_DEBUG] Response headers:', {
            'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
            'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set'
        });
        return originalSend.call(this, data);
    };

    res.json = function (data: any) {
        console.log('[CORS_DEBUG] Response headers:', {
            'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
            'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set'
        });
        return originalJson.call(this, data);
    };

    next();
};
