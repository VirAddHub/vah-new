/**
 * Centralized date formatting utilities
 * Uses en-GB locale consistently across the app
 */

const gbDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const gbDateTime = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const gbDateShort = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

/**
 * Format date as "02 Nov 2025"
 */
export function formatDate(d: Date | string | number): string {
    try {
        return gbDate.format(new Date(d));
    } catch {
        return String(d);
    }
}

/**
 * Format date and time as "02 Nov 2025, 14:30"
 */
export function formatDateTime(d: Date | string | number): string {
    try {
        return gbDateTime.format(new Date(d));
    } catch {
        return String(d);
    }
}

/**
 * Format date as "02/11/2025"
 */
export function formatDateShort(d: Date | string | number): string {
    try {
        return gbDateShort.format(new Date(d));
    } catch {
        return String(d);
    }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(d: Date | string | number): string {
    try {
        const date = new Date(d);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

        return formatDate(d);
    } catch {
        return String(d);
    }
}

