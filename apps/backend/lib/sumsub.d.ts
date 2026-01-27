// Type declarations for sumsub.js (CommonJS module)

export function sumsubFetch(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    bodyObj?: any
): Promise<any>;
