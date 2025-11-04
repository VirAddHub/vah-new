/**
 * @deprecated BFF client is deprecated. Use backendClient from '@/lib/backendClient' instead.
 * 
 * TEMP guard to catch any leftover BFF usage.
 * Remove this file once migration is complete.
 */

export type ApiError = { ok: false; status: number; code?: string; message: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResponse<T> = ApiOk<T> | ApiError;

const msg = `
⚠️ BFF client is disabled. 

Switch to backendClient from '@/lib/backendClient' and call backend endpoints directly.
Example: backendClient.get('/api/users/me') instead of api.get('/users/me')

Migration guide:
- Replace: import api from '@/lib/http'
- With: import { backendClient } from '@/lib/backendClient'
- Update paths: remove /api/bff prefix, use direct backend paths
`;

function nope() {
    const error = new Error(msg);
    // Always throw to catch issues early
    throw error;
}

export const api = {
    get: nope,
    post: nope,
    put: nope,
    patch: nope,
    del: nope,
};

export default api;
