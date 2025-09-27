// src/lib/blogDates.ts
export type IsoDate = string; // e.g. "2025-10-08T09:00:00Z"

export function formatDateLong(iso?: IsoDate) {
    if (!iso) return "";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
    }).format(d);
}

export function formatDateShort(iso?: IsoDate) {
    if (!iso) return "";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "Europe/London",
    }).format(d);
}

export function isPublished(iso?: IsoDate) {
    if (!iso) return false;
    return new Date(iso).getTime() <= Date.now();
}

export function isNew(iso?: IsoDate, days = 14) {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return t >= cutoff && t <= Date.now();
}

/**
 * Assigns `publishedAt` sequentially if missing, starting from `startISO`,
 * spaced by `cadenceDays`.
 */
export function schedulePosts<T extends { publishedAt?: IsoDate }>(
    posts: T[],
    startISO: IsoDate,
    cadenceDays = 7
): T[] {
    let cursor = new Date(startISO).getTime();
    const step = cadenceDays * 24 * 60 * 60 * 1000;
    return posts.map(p => {
        if (p.publishedAt) return p;
        const iso = new Date(cursor).toISOString();
        cursor += step;
        return { ...p, publishedAt: iso };
    });
}
