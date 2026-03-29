/**
 * Server-verified admin session via BFF → backend /api/auth/whoami.
 * Admin UI must not trust localStorage `vah_user` / `is_admin` flags (tamperable).
 *
 * Route handlers: `lib/server/requireBffAdmin.ts` performs the same whoami check before proxying `/api/bff/admin/*`.
 */

export type WhoamiUser = {
  id?: number;
  email?: string;
  is_admin?: boolean | number | null;
  role?: string | null;
  [key: string]: unknown;
};

/**
 * Optional Bearer from localStorage — credential transport only. Admin (or any) role is never
 * read from the JWT on the client; use fetchBffWhoami() / isServerVerifiedAdmin() for that.
 */
export function getOptionalJwtAuthorizationHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const t = localStorage.getItem("vah_jwt");
    if (t) return { Authorization: `Bearer ${t}` };
  } catch {
    /* ignore */
  }
  return {};
}

/** Aligns with backend DB fields returned by GET /api/auth/whoami (via BFF). */
export function isServerVerifiedAdmin(user: WhoamiUser | null | undefined): boolean {
  if (!user || typeof user !== "object") return false;
  const adminFlag = user.is_admin === true || user.is_admin === 1;
  const role = typeof user.role === "string" ? user.role.toLowerCase() : "";
  return adminFlag || role === "admin";
}

function extractUserFromWhoamiJson(json: unknown): WhoamiUser | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  if (root.ok !== true) return null;
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.user && typeof d.user === "object") return d.user as WhoamiUser;
  if ("id" in d && "email" in d) return d as WhoamiUser;
  return null;
}

export type BffWhoamiResult = {
  ok: boolean;
  status: number;
  user: WhoamiUser | null;
};

/**
 * Calls Next.js BFF whoami (forwards cookies + optional Bearer). User object is from DB on the server.
 */
export async function fetchBffWhoami(): Promise<BffWhoamiResult> {
  const res = await fetch("/api/bff/auth/whoami", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...getOptionalJwtAuthorizationHeader(),
    },
  });
  const status = res.status;
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  const user = res.ok ? extractUserFromWhoamiJson(json) : null;
  return { ok: res.ok, status, user };
}

/** Use with `credentials: 'include'` on admin BFF fetches; adds Bearer if stored JWT exists. */
export function buildAdminBffHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: "application/json",
    ...getOptionalJwtAuthorizationHeader(),
    ...extra,
  };
}
