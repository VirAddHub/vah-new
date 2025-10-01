// apps/frontend/lib/session.ts
export type StoredUser = Record<string, unknown>;

export function setStoredUser(user: StoredUser) {
    if (typeof window === "undefined") return; // no-op during SSR/build
    try {
        localStorage.setItem("vah_user", JSON.stringify(user));
    } catch {
        // ignore storage errors (private mode, quota, etc.)
    }
}

export function getStoredUser(): StoredUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("vah_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearStoredUser() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem("vah_user");
    } catch {
        // ignore
    }
}
