/**
 * Utility for opening protected PDFs reliably
 * Ensures proxy mode is used to avoid CORS/redirect issues with OneDrive
 */

export async function openProtectedPdf(downloadUrl: string) {
  // Ensure we append proxy params exactly once
  const url = new URL(downloadUrl);
  if (!url.searchParams.has('mode')) url.searchParams.set('mode', 'proxy');
  url.searchParams.set('disposition', 'inline');

  const resp = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/pdf' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);

  const tab = window.open();
  if (!tab) throw new Error('Popup blocked — allow popups for this site.');
  tab.location.href = objectUrl;

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
