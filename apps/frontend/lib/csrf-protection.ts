/**
 * csrf-protection.ts
 *
 * Implements the Double Submit Cookie pattern for CSRF protection.
 * A CSRF token is stored in both localStorage (or memory) and a cookie.
 * On mutating API requests, the client sends the token in a header.
 * The server-side middleware validates that the header token matches the cookie token.
 */
import { nanoid } from 'nanoid';

// --- Token Generation ---

/**
 * Generates a cryptographically secure, URL-safe string to be used as a CSRF token.
 * @returns {string} A new CSRF token.
 */
export function generateCSRFToken(): string {
  return nanoid(32); // Generates a 32-character secure random string
}

// --- Token Storage (Client-Side) ---

const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * Stores the CSRF token in client-side storage (e.g., localStorage).
 * @param {string} token The CSRF token to store.
 */
export function storeCSRFToken(token: string): void {
  try {
    localStorage.setItem(CSRF_TOKEN_KEY, token);
  } catch (error) {
    console.warn('localStorage is not available. CSRF token will be stored in memory.');
    // Fallback to in-memory storage if localStorage is blocked or unavailable
    (globalThis as any)[CSRF_TOKEN_KEY] = token;
  }
}

/**
 * Retrieves the CSRF token from client-side storage.
 * @returns {string | null} The stored CSRF token, or null if not found.
 */
export function getStoredCSRFToken(): string | null {
  try {
    return localStorage.getItem(CSRF_TOKEN_KEY);
  } catch (error) {
    return (globalThis as any)[CSRF_TOKEN_KEY] || null;
  }
}

/**
 * Clears the CSRF token from client-side storage.
 */
export function clearStoredCSRFToken(): void {
  try {
    localStorage.removeItem(CSRF_TOKEN_KEY);
  } catch (error) {
    delete (globalThis as any)[CSRF_TOKEN_KEY];
  }
}

/**
 * Clear CSRF token (on logout) - Legacy compatibility function
 */
export function clearCSRFToken(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(CSRF_TOKEN_KEY);
  document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/**
 * Add CSRF token to request headers - Legacy compatibility function
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getStoredCSRFToken() || generateCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

// --- Token Validation ---

/**
 * Validates that the request token (from header) matches the cookie token.
 * This is the core logic of the Double Submit Cookie pattern.
 * @param {string} requestToken The token sent in the request header.
 * @param {string} cookieToken The token sent in the cookie.
 * @returns {boolean} True if the tokens are valid and match, otherwise false.
 */
export function validateCSRFToken(requestToken: string, cookieToken: string): boolean {
  // REVISED: This logic now guarantees a boolean return value.
  if (!requestToken || !cookieToken) {
    return false; // If either token is missing, validation fails.
  }
  return requestToken === cookieToken; // Return the result of the strict comparison.
}