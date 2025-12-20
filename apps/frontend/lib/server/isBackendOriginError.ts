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
  if (!(err instanceof Error)) {
    return false;
  }
  
  const message = err.message.toLowerCase();
  return (
    message.includes('next_public_backend_api_origin') ||
    message.includes('next_public_api_url') ||
    message.includes('must be render origin') ||
    message.includes('backend origin') ||
    message.includes('server misconfigured')
  );
}
