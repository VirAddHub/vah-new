/**
 * Chrome / Edge (and some WebKit builds) honour PDF open parameters on the URL fragment.
 * FitH fits page width to the viewer — avoids 100% zoom clipping on narrow viewports.
 */
export function pdfEmbedUrl(url: string): string {
  const hash = url.indexOf('#');
  const base = hash >= 0 ? url.slice(0, hash) : url;
  const frag = hash >= 0 ? url.slice(hash + 1) : '';
  if (/view=|zoom=/i.test(frag)) return url;
  return `${base}#view=FitH`;
}
