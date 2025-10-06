import { AZURE_CONFIG, graphCredsPresent } from '../config/azure';

export async function getGraphToken(): Promise<string> {
  if (!graphCredsPresent()) {
    throw new Error('[graph token] Missing required environment variables. Check GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET or MS_* equivalents');
  }

  const tenant = AZURE_CONFIG.TENANT_ID!;
  const clientId = AZURE_CONFIG.CLIENT_ID!;
  const clientSecret = AZURE_CONFIG.CLIENT_SECRET!;
  
  console.log(`[msGraph] Getting token for tenant: ${tenant}, clientId: ${clientId}`);

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
        console.error(`[graph token] Failed to get token: ${r.status} ${t}`);
        throw new Error(`[graph token] ${r.status} ${t}`);
    }
    const j = (await r.json()) as { access_token?: string };
    if (!j.access_token) throw new Error('[graph token] missing access_token');
    console.log(`[msGraph] Successfully obtained token`);
    return j.access_token;
}

export async function fetchGraphFileByUserPath(
    upn: string,
    docPath: string, // e.g. "Documents/Scanned_Mail/user4_122_HMRC.pdf"
    disposition: 'inline' | 'attachment' = 'inline'
): Promise<Response> {
    console.log(`[msGraph] Fetching file for UPN: ${upn}, path: ${docPath}`);
    const token = await getGraphToken();
    // Graph endpoint: users/{UPN}/drive/root:/<path>:/content → 302 or 200
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
        upn
    )}/drive/root:/${encodeURIComponent(docPath)}:/content`;

    console.log(`[msGraph] Graph API URL: ${url}`);

    // We follow redirects so we end at the CDN response
    const r = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow',
        cache: 'no-store',
    });

    console.log(`[msGraph] Graph API response: ${r.status} ${r.statusText}`);
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
