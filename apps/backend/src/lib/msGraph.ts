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

    // Encode segments but keep the "/" separators
    const safePath = docPath
        .split('/')                 // -> ["Documents","Scanned_Mail","user4_122_HMRC.pdf"]
        .map((seg) => encodeURIComponent(seg))
        .join('/');                 // -> "Documents/Scanned_Mail/user4_122_HMRC.pdf"

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
        upn
    )}/drive/root:/${safePath}:/content`;

    console.log(`[msGraph] Fetching (user path): users/${upn}/drive/root:/${safePath}:/content`);
    console.log(`[msGraph] Graph API URL: ${url}`);

    // We follow redirects so we end at the CDN response
    const r = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow',
        cache: 'no-store',
    });

    console.log(`[msGraph] Graph API response: ${r.status} ${r.statusText}`);

    // If 404, try to list the drive root to see what's available
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
        console.log(`[msGraph] Analyzing SharePoint URL: ${u}`);
        console.log(`[msGraph] URL hostname: ${url.hostname}`);
        console.log(`[msGraph] URL pathname: ${url.pathname}`);
        
        // Handle both regular URLs and login_hint URLs
        let pathname = url.pathname;
        if (url.searchParams.has('id')) {
            // Extract from id parameter for login_hint URLs
            pathname = url.searchParams.get('id') || pathname;
            console.log(`[msGraph] Using id parameter: ${pathname}`);
        }
        
        const ix = pathname.indexOf('/Documents/');
        if (ix === -1) {
            console.log(`[msGraph] No /Documents/ found in pathname`);
            return null;
        }
        const path = pathname.slice(ix + 1); // drop leading slash
        const decodedPath = decodeURIComponent(path.replace(/^\/+/, '')); // "Documents/xyz.pdf"
        console.log(`[msGraph] Extracted path: ${decodedPath}`);
        return decodedPath;
    } catch (err) {
        console.error(`[msGraph] Error parsing SharePoint URL: ${err}`);
        return null;
    }
}

export function extractUPNFromSharePointUrl(u: string): string | null {
    try {
        const url = new URL(u);
        console.log(`[msGraph] Extracting UPN from SharePoint URL: ${u}`);
        
        // Handle both regular URLs and login_hint URLs
        let pathname = url.pathname;
        if (url.searchParams.has('id')) {
            pathname = url.searchParams.get('id') || pathname;
        }
        
        // Look for /personal/username pattern
        const personalMatch = pathname.match(/\/personal\/([^\/]+)/);
        if (personalMatch) {
            const username = personalMatch[1];
            console.log(`[msGraph] Found username in path: ${username}`);
            
            // Convert underscore format to email format
            // ops_virtualaddresshub_co_uk -> ops@virtualaddresshub.co.uk
            const upn = username.replace(/_/g, '.').replace(/\.co\.uk$/, '.co.uk');
            console.log(`[msGraph] Converted to UPN: ${upn}`);
            return upn;
        }
        
        // Fallback: try login_hint parameter
        const loginHint = url.searchParams.get('login_hint');
        if (loginHint) {
            console.log(`[msGraph] Using login_hint: ${loginHint}`);
            return loginHint;
        }
        
        console.log(`[msGraph] No UPN found in URL`);
        return null;
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
