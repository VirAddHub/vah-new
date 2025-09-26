// lib/api-client.ts - API response types
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; message: string; code?: string; status?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
export const isOk = <T,>(r: ApiResponse<T>): r is ApiOk<T> => r.ok === true;

// API Client Error class
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// API Client implementation
export const apiClient = {
  async get<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Request failed',
          status: response.status,
          code: data.code
        };
      }
      
      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Network error'
      };
    }
  },

  async post<T>(url: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      
      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Request failed',
          status: response.status,
          code: data.code
        };
      }
      
      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
};

// Error handler utility
export function handleApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}