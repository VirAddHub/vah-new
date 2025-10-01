// NEW: tiny helper to avoid "undefined is not valid JSON" crashes
export function parseJSONSafe<T>(value: unknown, fallback: T): T {
    try {
        if (typeof value !== 'string') return fallback;
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        return JSON.parse(trimmed) as T;
    } catch {
        return fallback;
    }
}

export function parseJSONSafeDebug<T>(value: unknown, fallback: T, label = 'parseJSONSafe'): T {
    try {
        if (typeof value !== 'string' || !value.trim()) return fallback;
        return JSON.parse(value) as T;
    } catch (e) {
        if (typeof window !== 'undefined') {
            // Helps find the callsite still feeding bad JSON
            console.warn(`[${label}] JSON parse failed`, { value });
        }
        return fallback;
    }
}
