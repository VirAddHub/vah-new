/** Plain-language message for a scan that could not be opened or downloaded. */
export function scanErrorMessage(status: number, code?: string | null): string {
  if (code === 'scan_file_missing') {
    return "The scan for this letter isn't available. Please contact support and we'll sort it out.";
  }
  if (status === 401) return 'Your session has ended. Please log in again to view this letter.';
  if (status === 403) return 'Complete the outstanding steps on your account to view this letter.';
  if (status === 404) return "This letter couldn't be found.";
  return "We couldn't load this scan. Please try again in a moment.";
}

/** Read the error code from a failed scan response and turn it into a message. */
export async function scanErrorFromResponse(res: Response): Promise<string> {
  let code: string | null = null;
  try { code = (await res.json())?.error ?? null; } catch { /* no body */ }
  return scanErrorMessage(res.status, code);
}
