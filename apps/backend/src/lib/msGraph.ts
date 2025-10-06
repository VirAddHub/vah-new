export async function getGraphToken(): Promise<string> {
  const tenant = process.env.MS_TENANT_ID!;
  const clientId = process.env.MS_CLIENT_ID!;
  const clientSecret = process.env.MS_CLIENT_SECRET!;
  const form = new URLSearchParams();
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  form.set('scope', 'https://graph.microsoft.com/.default');
  form.set('grant_type', 'client_credentials');

  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`[graph token] ${r.status} ${t}`);
  }
  const j = (await r.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('[graph token] missing access_token');
  return j.access_token;
}

export async function fetchGraphFileByUserPath(
  upn: string,
  docPath: string, // e.g. "Documents/Scanned_Mail/user4_122_HMRC.pdf"
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<Response> {
  const token = await getGraphToken();
  // Graph endpoint: users/{UPN}/drive/root:/<path>:/content → 302 or 200
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    upn
  )}/drive/root:/${encodeURIComponent(docPath)}:/content`;

  // We follow redirects so we end at the CDN response
  const r = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'follow',
    cache: 'no-store',
  });
  return r;
}

/** Extract "Documents/..." from a classic personal SharePoint URL */
export function extractDocumentsPathFromSharePointUrl(u: string): string | null {
  try {
    const url = new URL(u);
    const ix = url.pathname.indexOf('/Documents/');
    if (ix === -1) return null;
    const path = url.pathname.slice(ix + 1); // drop leading slash
    return decodeURIComponent(path.replace(/^\/+/, '')); // "Documents/xyz.pdf"
  } catch {
    return null;
  }
}

export function isSharePointPersonalUrl(u: string): boolean {
  try {
    const host = new URL(u).host.toLowerCase();
    return host.endsWith('.sharepoint.com') || host.endsWith('.sharepoint.com:443');
  } catch {
    return false;
  }
}
