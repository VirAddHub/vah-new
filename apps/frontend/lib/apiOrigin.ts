export function apiOrigin() {
    const raw = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || '';
    const withApi = raw.endsWith('/api') ? raw : raw.replace(/\/+$/, '') + '/api';
    return withApi; // always ends with /api
}
