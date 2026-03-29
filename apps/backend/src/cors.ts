import cors from 'cors';
import { isCorsOriginAllowed } from './lib/corsAllowlist';
import { safeAccessPath } from './lib/accessLog';

const isProduction = process.env.NODE_ENV === 'production';

function isAllowed(origin: string | undefined): boolean {
  return isCorsOriginAllowed(origin, isProduction);
}

type CorsOptionsOnly = Exclude<
  NonNullable<Parameters<typeof cors>[0]>,
  (...args: any[]) => any
>;

export const corsOptions: CorsOptionsOnly = {
  origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean | string) => void) {
    if (isAllowed(origin)) return cb(null, origin || true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
  ],
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

  // Log request details (path only — never originalUrl query strings / tokens)
  console.log('[CORS_DEBUG] Request:', {
    method: req.method,
    path: safeAccessPath(req),
    hasQuery: Boolean(
      (req.originalUrl && String(req.originalUrl).includes('?')) ||
        (req.url && String(req.url).includes('?'))
    ),
    origin: req.headers.origin,
  });

  // Override response methods to log headers after response
  res.send = function (data: any) {
    console.log('[CORS_DEBUG] Response headers:', {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
      'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set',
    });
    return originalSend.call(this, data);
  };

  res.json = function (data: any) {
    console.log('[CORS_DEBUG] Response headers:', {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
      'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set',
    });
    return originalJson.call(this, data);
  };

  next();
};
