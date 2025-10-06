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

// Map common folder name variations
function normalizeFolderPath(drivePath: string): string {
    // Common variations: Scanned_Mail vs Scanned Mail vs ScannedMail
    return drivePath
        .replace(/Documents\/Scanned_Mail\//g, 'Documents/Scanned Mail/')
        .replace(/Documents\/ScannedMail\//g, 'Documents/Scanned Mail/');
}

// List parent folder for debugging when path not found
async function listParentForDebug(token: string, upn: string, drivePath: string) {
    const parent = drivePath.split("/").slice(0, -1).join("/") || "";
    const listUrl = parent
        ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:/${encodeDrivePath(parent)}:/children`
        : `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root/children`;

    const r = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
    const t = await r.text().catch(() => "");
    console.log("[GRAPH LIST PARENT]", { parent, status: r.status, body: t.slice(0, 1000) });

    if (r.ok) {
        const data = JSON.parse(t);
        console.log(`[GRAPH LIST PARENT] Folder contents:`, data.value?.map((item: any) => item.name) || []);
    }
}

// Improved fallback with parent folder listing instead of search
async function tryFetchByPathOrListParent(
    token: string,
    upnOrSite: { upn?: string; host?: string; sitePath?: string; driveId?: string },
    drivePath: string
) {
    // 1) Try by path
    const encodedPath = encodeDrivePath(drivePath);
    let contentUrl: string;
    
    if (upnOrSite.driveId) {
        // Use driveId approach for OneDrive personal
        contentUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(upnOrSite.driveId)}/root:/${encodedPath}:/content`;
    } else if (upnOrSite.upn) {
        // Fallback to user approach
        contentUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upnOrSite.upn)}/drive/root:/${encodedPath}:/content`;
    } else {
        // SharePoint site drive
        contentUrl = `https://graph.microsoft.com/v1.0/sites/${upnOrSite.host}:${upnOrSite.sitePath}:/drive/root:/${encodedPath}:/content`;
    }

    let r = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r;

    // If not found, 404 -> list parent folder for debugging
    if (r.status === 404) {
        console.log(`[GRAPH FALLBACK] Path not found, listing parent folder for debugging...`);
        if (upnOrSite.upn) {
            await listParentForDebug(token, upnOrSite.upn, drivePath);
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
    let driveId: string | undefined;
    let upn: string | undefined;
    
    if (SITE_PATH.startsWith("/personal/")) {
        upn = extractUPNFromSitePath(SITE_PATH);

        // Use driveId-based path for better OneDrive compatibility
        console.log(`[GRAPH DEBUG] OneDrive personal drive detected`);
        console.log(`[GRAPH DEBUG] UPN: ${upn}`);
        console.log(`[GRAPH DEBUG] Drive path: ${drivePath}`);

        // First get the drive ID
        const userDriveResp = await fetch(
            `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!userDriveResp.ok) {
            const detail = await userDriveResp.text().catch(() => "");
            throw new Error(`Graph drive lookup error ${userDriveResp.status}: ${detail}`);
        }
        const { id } = await userDriveResp.json();
        driveId = id;
        console.log(`[GRAPH DEBUG] Drive ID: ${driveId}`);

        // Then fetch by driveId + path
        const encodedPath = encodeDrivePath(drivePath);
        contentUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId!)}/root:/${encodedPath}:/content`;

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
        upn,
        drivePath,
        url: contentUrl,
    });

    // Try original path first, then normalized path if it fails
    let upstream = await tryFetchByPathOrListParent(token,
        upn ? { upn, driveId } : { host: HOST, sitePath: SITE_PATH },
        drivePath
    );

    // If original path fails with 404, try normalized folder names
    if (!upstream.ok && upstream.status === 404) {
        const normalizedPath = normalizeFolderPath(drivePath);
        if (normalizedPath !== drivePath) {
            console.log(`[GRAPH FALLBACK] Trying normalized path: ${normalizedPath}`);
            upstream = await tryFetchByPathOrListParent(token,
                upn ? { upn, driveId } : { host: HOST, sitePath: SITE_PATH },
                normalizedPath
            );
        }
    }

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
