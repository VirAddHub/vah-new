import type { Response } from 'express';
import {
  fetchGraphFileByUserPath,
  extractDocumentsPathFromSharePointUrl,
  isSharePointPersonalUrl,
} from '../lib/msGraph';

const SHAREPOINT_UPN = process.env.MS_SHAREPOINT_USER_UPN || 'ops@virtualaddresshub.co.uk';

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
  if (!/^https?:\/\//i.test(fileUrl)) {
    res.status(400).send('Invalid file URL');
    return;
  }

  try {
    console.log(`[pdfProxy] Processing fileUrl: ${fileUrl}`);
    let finalResp: Response | globalThis.Response;

    if (isSharePointPersonalUrl(fileUrl)) {
      console.log(`[pdfProxy] Detected SharePoint URL, extracting path...`);
      // 🔐 Use Graph with app permissions against the ops mailbox drive
      const documentsPath = extractDocumentsPathFromSharePointUrl(fileUrl);
      console.log(`[pdfProxy] Extracted documents path: ${documentsPath}`);
      if (!documentsPath) {
        console.error(`[pdfProxy] Failed to extract documents path from: ${fileUrl}`);
        res.status(502).send('Unable to resolve SharePoint path');
        return;
      }
      console.log(`[pdfProxy] Fetching via Graph API with UPN: ${SHAREPOINT_UPN}`);
      finalResp = await fetchGraphFileByUserPath(SHAREPOINT_UPN, documentsPath, disposition);
    } else {
      console.log(`[pdfProxy] Non-SharePoint URL, fetching directly...`);
      // Non-SharePoint URL: fetch directly
      finalResp = await fetch(fileUrl, { redirect: 'follow', cache: 'no-store' });
    }

    if (!finalResp.ok) {
      const text = await safeText(finalResp);
      res
        .status(finalResp.status || 502)
        .send(text || `Upstream fetch failed (${finalResp.status})`);
      return;
    }

    const ab = await finalResp.arrayBuffer();
    const buf = Buffer.from(ab);

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', finalResp.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'private, max-age=0, no-store, must-revalidate');
    res.setHeader('Content-Disposition', `${disposition}; filename="${sanitizeFilename(filename)}"`);

    res.status(200).end(buf);
  } catch (err: any) {
    console.error('[pdfProxy] error details:', {
      message: err?.message,
      stack: err?.stack,
      fileUrl,
      SHAREPOINT_UPN
    });
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
