/**
 * Standardized API fetch wrapper
 * All API calls go through /api/bff (BFF pattern) and return standardized { ok, data, error } format
 */

export interface ApiResponse<T> {
    ok: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
}

export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public status?: number,
        public details?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Fetch from API with standardized error handling
 * @param path - API path (will be prefixed with /api/bff)
 * @param init - Fetch options
 * @returns Promise that resolves to the data (T) or throws ApiError
 */
export async function apiFetch<T>(
    path: string,
    init?: RequestInit
): Promise<T> {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `/api/bff${normalizedPath}`;

    const response = await fetch(url, {
        ...init,
        credentials: 'include', // Always include cookies for auth
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });

    let json: ApiResponse<T>;
    try {
        json = await response.json();
    } catch (e) {
        throw new ApiError(
            'parse_error',
            'Failed to parse response',
            response.status
        );
    }

    // Check HTTP status
    if (!response.ok) {
        const error = json.error || {
            code: 'http_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
        };
        throw new ApiError(
            error.code,
            error.message,
            response.status,
            error.details
        );
    }

    // Check API response envelope
    if (!json.ok) {
        const error = json.error || {
            code: 'api_error',
            message: 'API returned error',
        };
        throw new ApiError(
            error.code,
            error.message,
            response.status,
            error.details
        );
    }

    // Return data (guaranteed to exist if ok: true)
    return json.data as T;
}
