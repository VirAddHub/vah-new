/**
 * Safe error message for client responses.
 * In production, returns a generic message to avoid leaking DB/stack details.
 * Full error is always logged server-side by the caller.
 */
export function safeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV !== 'production') {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    return String(error ?? 'Unknown error');
  }
  return 'An error occurred. Please try again later.';
}
