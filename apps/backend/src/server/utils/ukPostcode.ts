/**
 * UK Postcode utilities
 * Handles extraction, validation, and normalization of UK postcodes
 */

/**
 * UK postcode regex pattern
 * Matches formats like: SW1A 1AA, M1 1AA, B33 8TH, W1A 0AX, EC1A 1BB
 * Pattern: ([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})
 */
export const UK_POSTCODE_REGEX = /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i;

/**
 * Extract UK postcode from a string
 * @param text - Text that may contain a postcode
 * @returns Normalized postcode (OUTCODE INCODE format) or null if not found
 */
export function extractUKPostcode(text: string): string | null {
    if (!text || typeof text !== 'string') return null;
    
    const match = text.toUpperCase().match(UK_POSTCODE_REGEX);
    if (!match) return null;
    
    // Normalize: remove extra spaces, ensure single space before last 3 chars
    const raw = match[1].replace(/\s+/g, ' ').trim();
    
    // Format: OUTCODE INCODE (e.g., SW1A 1AA)
    // OUTCODE is everything before the last 3 characters
    // INCODE is the last 3 characters (digit + 2 letters)
    if (raw.length >= 5) {
        const outcode = raw.slice(0, -3).trim();
        const incode = raw.slice(-3).trim();
        return `${outcode} ${incode}`;
    }
    
    return raw;
}

/**
 * Check if a string contains a UK postcode
 */
export function hasUKPostcode(text: string): boolean {
    return extractUKPostcode(text) !== null;
}

/**
 * Normalize a postcode string (handles various formats)
 * @param postcode - Postcode string (may have no space, extra spaces, lowercase)
 * @returns Normalized postcode or null if invalid
 */
export function normalizeUKPostcode(postcode: string | null | undefined): string | null {
    if (!postcode || typeof postcode !== 'string') return null;
    
    const extracted = extractUKPostcode(postcode);
    return extracted;
}

