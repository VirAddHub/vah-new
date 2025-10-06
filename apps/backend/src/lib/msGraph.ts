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
  docPath: string, // e.g. "Scanned_Mail/user4_122_HMRC.pdf" (already normalized)
  disposition: 'inline' | 'attachment' = 'inline'
): Promise<Response> {
  console.log(`[msGraph] Fetching file for UPN: ${upn}, path: ${docPath}`);
  const token = await getGraphToken();
  
  const safePath = docPath
    .split('/')                 // -> ["Scanned_Mail","user4_122_HMRC.pdf"]
    .map((seg) => encodeURIComponent(seg))
    .join('/');                 // -> "Scanned_Mail/user4_122_HMRC.pdf"

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    upn
  )}/drive/root:/${safePath}:/content`;

  console.log(`[msGraph] Trying user path: users/${upn}/drive/root:/${docPath}:/content`);
  console.log(`[msGraph] Graph API URL: ${url}`);

  // We follow redirects so we end at the CDN response
  const r = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'follow',
    cache: 'no-store',
  });
  
  console.log(`[msGraph] Graph API response: ${r.status} ${r.statusText}`);
  
  // If still 404, try to list the drive root to see what's available
  if (r.status === 404) {
    console.log(`[msGraph] 404 error - attempting to list drive contents for debugging`);
    try {
      const listUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root/children`;
      const listResp = await fetch(listUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      
      if (listResp.ok) {
        const listData = await listResp.json();
        console.log(`[msGraph] Drive root contents:`, listData.value?.map((item: any) => item.name) || 'No items found');
      } else {
        console.log(`[msGraph] Failed to list drive contents: ${listResp.status}`);
      }
    } catch (listErr) {
      console.log(`[msGraph] Error listing drive contents:`, listErr);
    }
  }
  
  return r;
}

/** Extract "Documents/..." from a classic personal SharePoint URL */
export function extractDocumentsPathFromSharePointUrl(u: string): string | null {
  try {
    const url = new URL(u);
    const idParam = url.searchParams.get('id');
    const source = idParam ? decodeURIComponent(idParam) : url.pathname;

    // prefer /Documents/... if present, else take everything after /personal/<seg>/
    const ix = source.toLowerCase().indexOf('/documents/');
    let path = ix !== -1 ? source.slice(ix + 1) : (source.match(/\/personal\/[^/]+\/(.*)$/i)?.[1] || '');

    path = decodeURIComponent(path).replace(/^\/+/, '');

    // 🔧 tenant quirk: Scanned_Mail sits at root; drop leading "Documents/"
    if (/^documents\/scanned_mail\//i.test(path)) {
      path = path.replace(/^documents\//i, '');   // -> "Scanned_Mail/…"
    }

    console.log(`[msGraph] Extracted and normalized path: ${path}`);
    return path || null;
  } catch (err) {
    console.error(`[msGraph] Error parsing SharePoint URL: ${err}`);
    return null;
  }
}

/** Convert a SharePoint 'personal' segment like
 *  'ops_virtualaddresshub_co_uk' → 'ops@virtualaddresshub.co.uk'
 */
export function upnFromPersonalSegment(seg: string): string | null {
    if (!seg) return null;

    // If it already looks like an email, just return it
    if (seg.includes('@')) return seg;

    // Split on underscores: first part = local, rest = domain parts
    const parts = seg.split('_').filter(Boolean);
    if (parts.length < 2) return null;

    const local = parts[0];
    const domain = parts.slice(1).join('.'); // "virtualaddresshub.co.uk"
    return `${local}@${domain}`;             // "ops@virtualaddresshub.co.uk"
}

/** Extract UPN from a SharePoint personal URL. Prefer login_hint, else derive from path */
export function extractUpnFromSharePointUrl(u: string): string | null {
    try {
        const url = new URL(u);

        // 1) If login_hint/email query param is present, use it
        const loginHint =
            url.searchParams.get('login_hint') ||
            url.searchParams.get('email') ||
            url.searchParams.get('user');
        if (loginHint) {
            console.log(`[msGraph] Using login_hint: ${loginHint}`);
            return decodeURIComponent(loginHint);
        }

        // 2) Fallback: derive from /personal/<seg>/...
        const m = url.pathname.match(/\/personal\/([^/]+)/i);
        if (!m) {
            console.log(`[msGraph] No /personal/ segment found in URL`);
            return null;
        }

        const upn = upnFromPersonalSegment(m[1]);
        console.log(`[msGraph] Converted personal segment '${m[1]}' to UPN: ${upn}`);
        return upn;
    } catch (err) {
        console.error(`[msGraph] Error extracting UPN from SharePoint URL: ${err}`);
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
