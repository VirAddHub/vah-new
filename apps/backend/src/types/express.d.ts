import "express";

declare global {
    namespace Express {
        /**
         * Minimal shape we rely on throughout the backend.
         * Keep this permissive (id can be number or string) to avoid breaking legacy call sites.
         */
        interface User {
            id: number | string;
            email?: string;
            is_admin?: boolean;
            role?: string;
            is_staff?: boolean;
            [key: string]: unknown;
        }
    }
}

import 'express';

declare module 'express-serve-static-core' {
    interface Request {
        user?: Express.User;
    }
}
