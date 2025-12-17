import { Response } from 'express';

/**
 * Standard API response helpers
 * All responses follow: { ok: boolean, data?: T, error?: { code: string, message: string, details?: any } }
 */

export function ok<T>(res: Response, data: T, status: number = 200): Response {
    return res.status(status).json({ ok: true, data });
}

export function fail(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: any
): Response {
    return res.status(status).json({
        ok: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    });
}

export interface PaginatedList<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
}

export function okList<T>(
    res: Response,
    list: PaginatedList<T>,
    status: number = 200
): Response {
    return res.status(status).json({
        ok: true,
        data: {
            items: list.items,
            page: list.page,
            page_size: list.page_size,
            total: list.total,
        },
    });
}

// Convenience helpers for common status codes
export const created = <T>(res: Response, data: T) => ok(res, data, 201);
export const noContent = (res: Response) => res.status(204).send();

export const badRequest = (res: Response, code: string, message: string, details?: any) =>
    fail(res, 400, code, message, details);

export const unauthorized = (res: Response, message: string = 'Unauthorized') =>
    fail(res, 401, 'unauthorized', message);

export const forbidden = (res: Response, message: string = 'Forbidden') =>
    fail(res, 403, 'forbidden', message);

export const notFound = (res: Response, message: string = 'Not found') =>
    fail(res, 404, 'not_found', message);

export const conflict = (res: Response, code: string, message: string, details?: any) =>
    fail(res, 409, code, message, details);

export const unprocessable = (res: Response, code: string, message: string, details?: any) =>
    fail(res, 422, code, message, details);

export const serverError = (res: Response, message: string = 'Internal server error') =>
    fail(res, 500, 'internal_error', message);
