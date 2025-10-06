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

    const upstream = await fetch(contentUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            // Accept can help Graph choose content flow; not strictly required:
            Accept: "*/*",
        },
        // node-fetch follows Graph's 302 to the short-lived download URL automatically
    });

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
