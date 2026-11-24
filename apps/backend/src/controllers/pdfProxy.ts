import type { Response } from 'express';
import { logger } from '../lib/logger';
import {
  fetchGraphFileByUserPath,
  extractDocumentsPathFromSharePointUrl,
  extractUpnFromSharePointUrl,
  isSharePointPersonalUrl,
} from '../lib/msGraph';
import { AZURE_CONFIG } from '../config/azure';

/**
 * Fetches a PDF from a given HTTPS URL, buffers it, and serves it with
 * browser-friendly headers (no X-Frame-Options leakage).
 *
 * @param res         Express response
 * @param fileUrl     Direct HTTPS URL to the PDF (SharePoint/OneDrive CDN, etc.)
 * @param filename    Suggested filename (without path)
 * @param disposition 'inline' (default) or 'attachment'
 */
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 20_000;
/** Storage hosts the scan proxy may fetch directly (exact host or "." suffix). Extend with PDF_PROXY_ALLOWED_HOSTS. */
const DEFAULT_ALLOWED_HOSTS = ['.sharepoint.com', 'graph.microsoft.com', '.1drv.com', '1drv.ms', 'onedrive.live.com', '.svc.ms'];

function allowedHosts(): string[] {
  const extra = (process.env.PDF_PROXY_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...extra];
}

/** True only for https URLs on an approved storage host (security review F34). */
export function isAllowedDocumentUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  return allowedHosts().some((h) => (h.startsWith('.') ? host.endsWith(h) && host.length > h.length : host === h));
}

/** Host only, for logs — never the path or query (they can identify a customer or carry a signature). */
function hostOf(raw: string): string {
  try { return new URL(raw).hostname; } catch { return 'invalid-url'; }
}

async function fetchApprovedUrl(start: string): Promise<globalThis.Response> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedDocumentUrl(url)) throw Object.assign(new Error('document_host_not_allowed'), { status: 400 });
    const resp = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) } as RequestInit);
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('location');
      if (!loc) throw Object.assign(new Error('redirect_without_location'), { status: 502 });
      url = new URL(loc, url).toString();
      continue;
    }
    return resp;
  }
  throw Object.assign(new Error('too_many_redirects'), { status: 502 });
}

async function readCapped(resp: globalThis.Response): Promise<Buffer> {
  const declared = Number(resp.headers.get('content-length') || 0);
  if (declared > MAX_DOCUMENT_BYTES) throw Object.assign(new Error('document_too_large'), { status: 413 });
  const body = resp.body;
  if (!body) return Buffer.from(await resp.arrayBuffer());
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOCUMENT_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw Object.assign(new Error('document_too_large'), { status: 413 });
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Only document types are served; anything else (e.g. HTML) is refused rather than rendered on our origin. */
function deliverableContentType(upstream: string | null): string | null {
  const ct = (upstream || '').split(';')[0].trim().toLowerCase();
  if (!ct || ct === 'application/pdf' || ct === 'application/octet-stream' || ct === 'binary/octet-stream') return 'application/pdf';
  if (/^image\/(png|jpe?g|gif|webp|tiff)$/.test(ct)) return ct;
  return null;
}

export async function streamPdfFromUrl(
  res: Response,
  fileUrl: string,
  filename: string,
  disposition: 'inline' | 'attachment' = 'inline'
) {
  if (!/^https:\/\//i.test(fileUrl)) {
    res.status(400).send('Invalid file URL');
    return;
  }

  try {
    let finalResp: Response | globalThis.Response;

    if (isSharePointPersonalUrl(fileUrl)) {
      // Use Graph with app permissions against the correct user's drive
      const documentsPath = extractDocumentsPathFromSharePointUrl(fileUrl);
      const upn = extractUpnFromSharePointUrl(fileUrl) || AZURE_CONFIG.SHAREPOINT_USER_UPN;
      if (!documentsPath) {
        logger.error('[pdfProxy] sharepoint_path_unresolved', { host: hostOf(fileUrl) });
        res.status(502).send('Unable to resolve document location');
        return;
      }
      finalResp = await fetchGraphFileByUserPath(upn, documentsPath, disposition);
    } else {
      finalResp = await fetchApprovedUrl(fileUrl);
    }

    if (!finalResp.ok) {
      logger.warn('[pdfProxy] upstream_status', { status: finalResp.status, host: hostOf(fileUrl) });
      res.status(finalResp.status === 404 ? 404 : 502).send('Error retrieving the document');
      return;
    }

    const contentType = deliverableContentType(finalResp.headers.get('content-type'));
    if (!contentType) {
      logger.warn('[pdfProxy] unexpected_content_type', { host: hostOf(fileUrl) });
      res.status(502).send('Error retrieving the document');
      return;
    }

    const buf = await readCapped(finalResp as globalThis.Response);

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'private, max-age=0, no-store, must-revalidate');
    res.setHeader('Content-Disposition', `${disposition}; filename="${sanitizeFilename(filename)}"`);

    res.status(200).end(buf);
  } catch (err: any) {
    const status = Number(err?.status) || 502;
    logger.error('[pdfProxy] fetch_failed', { message: err?.message, host: hostOf(fileUrl) });
    res.status(status === 400 || status === 413 ? status : 502).send('Error retrieving the document');
  }
}

function sanitizeFilename(name: string) {
  return (name || 'document.pdf').replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 120) || 'document.pdf';
}


export default streamPdfFromUrl
