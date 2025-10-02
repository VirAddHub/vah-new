// apps/backend/src/lib/time.ts
// Centralized time utilities for timestamp standardization

/**
 * Get current timestamp in milliseconds (canonical format)
 * Use this for all BIGINT timestamp columns
 */
export const nowMs = (): number => Date.now();

/**
 * Get current timestamp as ISO string
 * Use this for display/logging purposes
 */
export const nowISO = (): string => new Date().toISOString();

/**
 * Convert any timestamp format to milliseconds
 * Handles: milliseconds, seconds, ISO strings, Date objects
 */
export const toMs = (value: any): number | null => {
  if (value == null || value === '') return null;

  const num = Number(value);

  // Already milliseconds (13+ digits)
  if (Number.isFinite(num) && String(value).length >= 13) {
    return num;
  }

  // Seconds (10 digits or less) - convert to milliseconds
  if (Number.isFinite(num) && String(value).length <= 10) {
    return num * 1000;
  }

  // ISO string or Date-parsable string
  try {
    return new Date(value).getTime();
  } catch {
    return null;
  }
};

/**
 * Convert any timestamp format to Date object
 * Handles: milliseconds, seconds, ISO strings, Date objects
 */
export const toDateOrNull = (value: any): Date | null => {
  const ms = toMs(value);
  return ms ? new Date(ms) : null;
};

/**
 * Convert any timestamp format to ISO string
 * Handles: milliseconds, seconds, ISO strings, Date objects
 */
export const toISOString = (value: any): string | null => {
  const date = toDateOrNull(value);
  return date ? date.toISOString() : null;
};

/**
 * Calculate time ranges in milliseconds
 */
export const MS_SECOND = 1000;
export const MS_MINUTE = 60 * MS_SECOND;
export const MS_HOUR = 60 * MS_MINUTE;
export const MS_DAY = 24 * MS_HOUR;
export const MS_WEEK = 7 * MS_DAY;
export const MS_MONTH = 30 * MS_DAY; // Approximate
export const MS_YEAR = 365 * MS_DAY; // Approximate

/**
 * Get timestamp for N days ago
 */
export const daysAgoMs = (days: number): number => {
  return nowMs() - (days * MS_DAY);
};

/**
 * Get timestamp for N hours ago
 */
export const hoursAgoMs = (hours: number): number => {
  return nowMs() - (hours * MS_HOUR);
};

/**
 * Validate that a timestamp is in milliseconds (13+ digits)
 */
export const isValidMsTimestamp = (value: any): boolean => {
  const ms = toMs(value);
  return ms !== null && String(ms).length >= 13;
};

/**
 * Format timestamp for SQL queries
 * Returns parameterized value for safe SQL execution
 */
export const sqlTimestamp = (value: any): number => {
  const ms = toMs(value);
  if (ms === null) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return ms;
};