/**
 * Auth utilities for frontend
 * 
 * IMPORTANT: Frontend should NOT read tokens from localStorage.
 * We rely on HttpOnly cookie `vah_session` for security.
 * 
 * For SSR/Server Actions, read cookies via next/headers on the server side.
 * For client calls, just use `api.*` which sends credentials automatically.
 */

/**
 * Client-side hint for authentication status
 * This is a heuristic and should not be relied upon for security.
 * Always verify auth on the server side.
 * 
 * In SSR contexts, use server-side cookie reading instead.
 */
export function isAuthenticatedClientHint(): boolean {
    // Could check for presence of non-sensitive cookie or SSR-provided flag
    // For now, return true as a hint (actual auth is handled server-side)
    return true;
}

/**
 * Check if user is admin (client hint only - verify on server)
 * This requires server-side data to be provided via SSR or API call
 */
export async function checkAdminStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/bff/auth/whoami", {
            credentials: "include",
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.ok && data?.data?.is_admin === true;
    } catch {
        return false;
    }
}

