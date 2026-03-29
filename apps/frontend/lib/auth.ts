/**
 * Auth utilities for frontend
 * 
 * IMPORTANT: Frontend should NOT read tokens from localStorage.
 * We rely on HttpOnly cookie `vah_session` for security.
 * 
 * For SSR/Server Actions, read cookies via next/headers on the server side.
 * For client calls, just use `api.*` which sends credentials automatically.
 */

import { getOptionalJwtAuthorizationHeader } from "@/lib/verifiedAdminSession";

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
 * Whether the current session is an admin, from GET /api/bff/auth/whoami (server DB fields).
 */
export async function checkAdminStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/bff/auth/whoami", {
            credentials: "include",
            headers: { Accept: "application/json", ...getOptionalJwtAuthorizationHeader() } as HeadersInit,
        });
        if (!res.ok) return false;
        const data = await res.json();
        const user =
            data?.data?.user && typeof data.data.user === "object"
                ? data.data.user
                : data?.data && typeof data.data === "object" && "id" in data.data
                  ? data.data
                  : null;
        if (!user) return false;
        return (
            user.is_admin === true ||
            user.is_admin === 1 ||
            (typeof user.role === "string" && user.role.toLowerCase() === "admin")
        );
    } catch {
        return false;
    }
}

