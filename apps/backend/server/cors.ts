// server/cors.ts
import cors from 'cors';

export function makeCors() {
    const allowed = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    return cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowed.length === 0) return cb(null, true);
            cb(null, allowed.includes(origin));
        },
        credentials: true,
        exposedHeaders: ['Content-Disposition'],
    });
}
