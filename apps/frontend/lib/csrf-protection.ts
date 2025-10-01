// CSRF Protection utilities
// This implements the Double Submit Cookie pattern for CSRF protection

const CSRF_TOKEN_KEY = 'vah_csrf_token';

/**
 * Generate a cryptographically secure random token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token
 */
export function getCSRFToken(): string {
  if (typeof window === 'undefined') return '';
  
  let token = localStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateCSRFToken();
    localStorage.setItem(CSRF_TOKEN_KEY, token);
    // Also set as cookie for server-side validation
    document.cookie = `vah_csrf_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure=${location.protocol === 'https:'}`;
  }
  return token;
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(CSRF_TOKEN_KEY);
  document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Validate CSRF token (for server-side use)
 */
export function validateCSRFToken(requestToken: string, cookieToken: string): boolean {
  return requestToken && cookieToken && requestToken === cookieToken;
}
