import { graphBearer } from "../lib/graph";

const HOST = process.env.GRAPH_SITE_HOST!;
const _SITE_PATH = (process.env.GRAPH_SITE_PATH || "").replace(/\/+$/, ""); // strip trailing slash
const SITE_PATH = decodeURIComponent(_SITE_PATH); // normalize

// /personal/ops_virtualaddresshub_co_uk  ->  ops@virtualaddresshub.co.uk
function extractUPNFromSitePath(sitePath: string): string {
    const m = /^\/personal\/([^/]+)$/.exec(sitePath);
    if (!m) throw new Error(`Invalid OneDrive personal path: ${sitePath}`);
    const alias = m[1]; // e.g., "ops_virtualaddresshub_co_uk"
    const parts = alias.split("_").filter(Boolean);
    if (parts.length < 2) throw new Error(`Unexpected alias format: ${alias}`);
    const user = parts.shift()!;              // "ops"
    const domain = parts.join(".");           // "virtualaddresshub.co.uk"
    return `${user}@${domain}`;
}

// Encode each path segment safely for the :/path:/ form
function encodeDrivePath(path: string): string {
    return path
        .split("/")
        .filter(Boolean)
        .map(seg => encodeURIComponent(seg))
        .join("/");
}

// Fallback search by filename if path-based fetch fails with 404
async function tryFetchByPathOrSearch(
    token: string,
    upnOrSite: { upn?: string; host?: string; sitePath?: string },
    drivePath: string
) {
    // 1) Try by path
    const encodedPath = encodeDrivePath(drivePath);
    const contentUrl = upnOrSite.upn
        ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upnOrSite.upn)}/drive/root:/${encodedPath}:/content`
        : `https://graph.microsoft.com/v1.0/sites/${upnOrSite.host}:${upnOrSite.sitePath}:/drive/root:/${encodedPath}:/content`;

    let r = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r;

    // If not found, 404 -> search by filename
    if (r.status === 404) {
        console.log(`[GRAPH FALLBACK] Path not found, searching by filename...`);
        const filename = drivePath.split("/").pop() || "";
        // Try different search approaches for OneDrive
        let searchUrl: string;
        if (upnOrSite.upn) {
            // For OneDrive personal, try listing the folder first, then search
            searchUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upnOrSite.upn)}/drive/root:/Documents/Scanned_Mail:/children`;
        } else {
            searchUrl = `https://graph.microsoft.com/v1.0/sites/${upnOrSite.host}:${upnOrSite.sitePath}:/drive/root/search(q='${encodeURIComponent(filename)}')`;
        }

        console.log(`[GRAPH FALLBACK] Listing folder: ${searchUrl}`);
        const sr = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (sr.ok) {
            const data = await sr.json();
            console.log(`[GRAPH FALLBACK] Folder contents:`, data.value?.map((item: any) => item.name) || []);

            const match = (data.value || []).find((it: any) => it.name === filename);
            if (match?.id) {
                console.log(`[GRAPH FALLBACK] Found file by folder listing: ${match.name} at ${match.parentReference?.path}`);
                const byIdUrl = upnOrSite.upn
                    ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upnOrSite.upn)}/drive/items/${match.id}/content`
                    : `https://graph.microsoft.com/v1.0/sites/${upnOrSite.host}:${upnOrSite.sitePath}:/drive/items/${match.id}/content`;
                r = await fetch(byIdUrl, { headers: { Authorization: `Bearer ${token}` } });
                if (r.ok) return r;
            } else {
                console.log(`[GRAPH FALLBACK] No matching file found in folder listing`);
                console.log(`[GRAPH FALLBACK] Available files:`, data.value?.map((item: any) => item.name) || []);
            }
        } else {
            console.log(`[GRAPH FALLBACK] Folder listing failed: ${sr.status}`);
            const errorText = await sr.text().catch(() => "");
            console.log(`[GRAPH FALLBACK] Error details: ${errorText}`);
        }
    }

    // Return original response (with its error body for logs)
    return r;
}

// In: https://.../personal/ops_.../Documents/Scanned_Mail/user4_1111_bilan.pdf
// Out: Documents/Scanned_Mail/user4_1111_bilan.pdf
export function extractDrivePathFromSharePointUrl(fullUrl: string): string {
    const u = new URL(fullUrl);
    const expectedPrefix = SITE_PATH; // already has no trailing slash
    // Normal case: after the /personal/... prefix
    if (u.pathname.startsWith(expectedPrefix + "/")) {
        const rest = u.pathname.slice(expectedPrefix.length + 1);
        return decodeURIComponent(rest.replace(/^\/+/, ""));
    }
    // Fallback: find /Documents/...
    const m = /\/Documents\/.+$/i.exec(u.pathname);
    if (m) return decodeURIComponent(m[0].replace(/^\/+/, ""));
    throw new Error(`Unable to derive drive path from URL: ${fullUrl}`);
}

export async function streamSharePointFileByPath(
    res: any,
    drivePath: string,
    opts?: { filename?: string; disposition?: "inline" | "attachment" }
) {
    const token = await graphBearer();

    // Build correct endpoint: OneDrive personal uses users/{UPN}/drive
    let contentUrl: string;
    if (SITE_PATH.startsWith("/personal/")) {
        const upn = extractUPNFromSitePath(SITE_PATH);
        const encodedPath = encodeDrivePath(drivePath);
        contentUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
            upn
        )}/drive/root:/${encodedPath}:/content`;

        console.log(`[GRAPH DEBUG] OneDrive personal drive detected`);
        console.log(`[GRAPH DEBUG] UPN: ${upn}`);
        console.log(`[GRAPH DEBUG] Drive path: ${drivePath}`);
        console.log(`[GRAPH DEBUG] Encoded path: ${encodedPath}`);
        console.log(`[GRAPH DEBUG] Graph URL: ${contentUrl}`);
    } else {
        // SharePoint site drive
        const encodedPath = encodeDrivePath(drivePath);
        contentUrl = `https://graph.microsoft.com/v1.0/sites/${HOST}:${SITE_PATH}:/drive/root:/${encodedPath}:/content`;

        console.log(`[GRAPH DEBUG] SharePoint site drive detected`);
        console.log(`[GRAPH DEBUG] Host: ${HOST}`);
        console.log(`[GRAPH DEBUG] Site path: ${SITE_PATH}`);
        console.log(`[GRAPH DEBUG] Drive path: ${drivePath}`);
        console.log(`[GRAPH DEBUG] Encoded path: ${encodedPath}`);
        console.log(`[GRAPH DEBUG] Graph URL: ${contentUrl}`);
    }

    console.log("[GRAPH FETCH]", {
        upn: SITE_PATH.startsWith("/personal/") ? extractUPNFromSitePath(SITE_PATH) : null,
        drivePath,
        url: contentUrl,
    });

    // Use fallback search if path-based fetch fails
    const upn = SITE_PATH.startsWith("/personal/") ? extractUPNFromSitePath(SITE_PATH) : undefined;
    const upstream = await tryFetchByPathOrSearch(token,
        upn ? { upn } : { host: HOST, sitePath: SITE_PATH },
        drivePath
    );

    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        throw new Error(`Graph content error ${upstream.status}: ${detail}`);
    }

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const name = opts?.filename || drivePath.split("/").pop() || "file";
    const disp = opts?.disposition || "inline";

    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
    res.setHeader("Cache-Control", "private, no-store");
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);

    // @ts-ignore Readable stream piping in Node
    upstream.body.pipe(res);
}
