/**
 * csrf-protection.ts
 *
 * Implements the Double Submit Cookie pattern for CSRF protection.
 * The canonical CSRF token for outgoing requests is the `vah_csrf_token` cookie,
 * read directly from `document.cookie` in the API client (apiClient.ts).
 *
 * The functions below exist for backward-compatibility but are intentionally
 * in-memory only — NOT localStorage — to prevent third-party script exfiltration.
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

// --- In-memory token store (M-2 fix: never localStorage) ---
// CSRF tokens must not be readable by third-party scripts.
// The real token is always read from document.cookie by the API client.

const CSRF_TOKEN_KEY = 'csrf_token';
const _memStore = new Map<string, string>();

/**
 * Store the CSRF token in memory only (never localStorage).
 * NOTE: The canonical CSRF token source is document.cookie ('vah_csrf_token'),
 * not this in-memory store. This is kept for backward-compatibility only.
 */
export function storeCSRFToken(token: string): void {
  _memStore.set(CSRF_TOKEN_KEY, token);
}

/**
 * Retrieve the CSRF token from in-memory store.
 * Prefer reading from document.cookie ('vah_csrf_token') directly.
 */
export function getStoredCSRFToken(): string | null {
  return _memStore.get(CSRF_TOKEN_KEY) ?? null;
}

/**
 * Clear the CSRF token from in-memory store.
 */
export function clearStoredCSRFToken(): void {
  _memStore.delete(CSRF_TOKEN_KEY);
}

/**
 * Clear CSRF token (on logout).
 * Clears both in-memory and the cookie, so session state is fully reset.
 */
export function clearCSRFToken(): void {
  if (typeof window === 'undefined') return;
  _memStore.delete(CSRF_TOKEN_KEY);
  document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/**
 * @deprecated Use the API client (apiClient.ts / http.ts) which reads the token
 * directly from document.cookie. Do not use addCSRFHeader directly.
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[csrf-protection] addCSRFHeader is deprecated. The API client reads vah_csrf_token ' +
      'from document.cookie automatically. Do not call addCSRFHeader directly.'
    );
  }
  const token = getStoredCSRFToken() ?? generateCSRFToken();
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