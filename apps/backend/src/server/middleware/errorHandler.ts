import { Request, Response, NextFunction } from 'express';
import { fail } from '../lib/apiResponse';

/**
 * Global error handler middleware
 * Catches all thrown errors and returns standardized { ok: false, error: { code, message } } format
 * Never leaks stack traces or secrets in production
 */
export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // If response already sent, delegate to Express default handler
    if (res.headersSent) {
        next(err);
        return;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Log error details (server-side only)
    console.error('[ErrorHandler]', {
        message: err?.message,
        stack: isProduction ? undefined : err?.stack,
        path: req.path,
        method: req.method,
        statusCode: err?.statusCode || err?.status,
    });

    // Handle known error types
    if (err?.statusCode || err?.status) {
        const status = err.statusCode || err.status;
        const code = err.code || err.error || 'request_error';
        const message = err.message || 'Request failed';
        const details = isProduction ? undefined : err.details;

        fail(res, status, code, message, details);
        return;
    }

    // Handle validation errors (e.g., from Zod)
    if (err?.name === 'ZodError' || err?.issues) {
        const issues = err.issues || [];
        const message = issues.map((i: any) => i.message || `${i.path.join('.')}: ${i.message}`).join(', ');
        fail(res, 422, 'validation_error', message, isProduction ? undefined : issues);
        return;
    }

    // Handle database errors
    if (err?.code?.startsWith('23') || err?.code === '23505') {
        // Unique constraint violation
        fail(res, 409, 'duplicate_entry', 'A record with this value already exists');
        return;
    }

    if (err?.code === '23503') {
        // Foreign key violation
        fail(res, 400, 'invalid_reference', 'Referenced record does not exist');
        return;
    }

    // Default: internal server error
    const message = isProduction
        ? 'An internal error occurred. Please try again later.'
        : err?.message || 'Internal server error';

    fail(res, 500, 'internal_error', message, isProduction ? undefined : { stack: err?.stack });
}
