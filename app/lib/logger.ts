// app/lib/logger.ts
// Safe logging utilities for frontend - synced from backend

// Safe logging functions that use the original console methods
export const log = (...args: any[]) => console.log(...args);
export const warn = (...args: any[]) => console.warn(...args);
export const crit = (...args: any[]) => console.error('🚨 CRITICAL:', ...args);

// Specialized error logger for frontend
export const clientError = (err: Error | string, context?: any) => {
    const message = typeof err === 'string' ? err : err?.message || String(err);
    crit('CLIENT ERROR DETECTED:', err, context);

    // In production, you might want to send this to your error tracking service
    // e.g., Sentry.captureException(err, { extra: context });
};

// API error logger
export const apiError = (err: any, endpoint?: string, params?: any) => {
    const message = err?.message || String(err);
    crit('API ERROR DETECTED:', err, { endpoint, params });

    // Log to console for debugging
    console.error('[api] error:', err?.code, err?.message, '\nEndpoint:', endpoint, '\nParams:', params);
};

// Development logger (only logs in development)
export const devLog = (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('[DEV]', ...args);
    }
};

export default { log, warn, crit, clientError, apiError, devLog };
