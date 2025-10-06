import type { Response } from 'express';

/**
 * Fetches a PDF from a given HTTPS URL, buffers it, and serves it with
 * browser-friendly headers (no X-Frame-Options leakage).
 *
 * @param res         Express response
 * @param fileUrl     Direct HTTPS URL to the PDF (SharePoint/OneDrive CDN, etc.)
 * @param filename    Suggested filename (without path)
 * @param disposition 'inline' (default) or 'attachment'
 */
export async function streamPdfFromUrl(
  res: Response,
  fileUrl: string,
  filename: string,
  disposition: 'inline' | 'attachment' = 'inline'
) {
  // Basic validation
  if (!/^https?:\/\//i.test(fileUrl)) {
    res.status(400).send('Invalid file URL');
    return;
  }

  try {
    // Follow redirects (Graph /content often 302 → CDN)
    const upstream = await fetch(fileUrl, { redirect: 'follow', cache: 'no-store' });

    if (!upstream.ok) {
      const text = await safeText(upstream);
      res.status(upstream.status || 502).send(text || 'Upstream fetch failed');
      return;
    }

    // Buffer entire file to strip upstream headers entirely
    const ab = await upstream.arrayBuffer();
    const buf = Buffer.from(ab);

    // Our own safe headers only
    res.removeHeader('X-Frame-Options'); // ensure we never send this
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'private, max-age=0, no-store, must-revalidate');
    res.setHeader('Content-Disposition', `${disposition}; filename="${sanitizeFilename(filename)}"`);

    // Optional CORS (blob mode does not need it)
    // res.setHeader('Access-Control-Allow-Origin', 'https://virtualaddresshub.co.uk');
    // res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(200).end(buf);
  } catch (err) {
    console.error('[pdfProxy] error fetching', fileUrl, err);
    res.status(502).send('Error retrieving the document');
  }
}

function sanitizeFilename(name: string) {
  return (name || 'document.pdf').replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 120) || 'document.pdf';
}

async function safeText(r: Response | globalThis.Response) {
  try { return await (r as any).text(); } catch { return ''; }
}

export default streamPdfFromUrl
