/**
 * Helper to detect backend origin configuration errors
 * 
 * Use this to check if an error is related to backend origin configuration
 * before returning appropriate error responses in BFF routes.
 */

/**
 * Checks if an error is a backend origin configuration error.
 * 
 * @param err The error to check
 * @returns true if the error is a backend origin configuration error
 */
export function isBackendOriginConfigError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (
      err.message.includes('BACKEND_API_ORIGIN is not set') ||
      err.message.includes('Invalid BACKEND_API_ORIGIN') ||
      err.message.includes('Invalid NEXT_PUBLIC_API_URL')
    )
  );
}
