/**
 * When Vercel Attack Challenge Mode is active, the scan-url API can return
 * the Security Checkpoint HTML instead of the PDF. Detect that and surface
 * a clear message so we never render the checkpoint page inside the viewer.
 *
 * To reduce checkpoint triggers: in Vercel Dashboard go to your project →
 * Firewall (or Bot Management) → Attack Challenge Mode and consider
 * disabling it, or add an allowlist for /api/bff/mail/scan-url if available.
 */
const CHECKPOINT_MARKERS = [
  'Vercel Security Checkpoint',
  "We're verifying your browser",
  'security-checkpoint',
];

export const SCAN_CHECKPOINT_MESSAGE =
  "Preview couldn't load due to a security check. Try opening the document in a new tab (View Scan → open in new tab) or try again in a moment.";

/**
 * Returns true if the response body looks like HTML (e.g. Vercel checkpoint)
 * rather than a PDF. Uses Content-Type first, then sniffs the buffer.
 */
export function isCheckpointOrHtmlResponse(
  contentType: string | null,
  arrayBuffer: ArrayBuffer
): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('text/html')) return true;
  if (ct.includes('application/pdf')) return false;

  const bytes = new Uint8Array(arrayBuffer);
  const len = Math.min(bytes.length, 1024);
  let text = '';
  for (let i = 0; i < len; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  const lower = text.toLowerCase();
  if (lower.startsWith('%pdf-')) return false; // PDF magic
  if (lower.includes('<!doctype') || lower.includes('<html')) {
    return CHECKPOINT_MARKERS.some((m) => text.includes(m));
  }
  return false;
}
