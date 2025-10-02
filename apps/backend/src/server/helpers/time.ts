// src/server/helpers/time.ts
// Utility functions for handling timestamps and dates

/**
 * Converts various timestamp formats to a Date object or null
 * Handles milliseconds, seconds, ISO strings, and Date objects
 */
export const toDateOrNull = (value: any): Date | null => {
    if (value == null || value === '') return null;
    
    const num = Number(value);
    
    // Milliseconds since epoch (13+ digits)
    if (Number.isFinite(num) && String(value).length >= 13) {
        return new Date(num);
    }
    
    // Seconds since epoch (10 digits or less)
    if (Number.isFinite(num) && String(value).length <= 10) {
        return new Date(num * 1000);
    }
    
    // ISO string or Date-parsable string
    try {
        return new Date(value);
    } catch {
        return null;
    }
};

/**
 * Converts a Date to ISO string for API responses
 */
export const toISOString = (value: any): string | null => {
    const date = toDateOrNull(value);
    return date ? date.toISOString() : null;
};

/**
 * Gets current timestamp as milliseconds (for updated_at fields)
 */
export const nowMs = (): number => Date.now();

/**
 * Gets current timestamp as ISO string (for created_at fields)
 */
export const nowISO = (): string => new Date().toISOString();
