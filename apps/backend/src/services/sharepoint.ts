import { graphBearer } from "../lib/graph";
import { Readable } from "node:stream";

const HOST = process.env.GRAPH_SITE_HOST!;
const _SITE_PATH = (process.env.GRAPH_SITE_PATH || "").replace(/\/+$/, "");
const SITE_PATH = decodeURIComponent(_SITE_PATH);
const DEBUG = process.env.GRAPH_DEBUG === "1";

function log(...args: any[]) {
    if (DEBUG) console.log(...args);
}

export function extractUPNFromSitePath(sitePath: string): string {
    const m = /^\/personal\/([^/]+)$/.exec(sitePath);
    if (!m) throw new Error(`Invalid OneDrive personal path: ${sitePath}`);
    const alias = m[1];
    const parts = alias.split("_").filter(Boolean);
    if (parts.length < 2) throw new Error(`Unexpected alias format: ${alias}`);
    const user = parts.shift()!;
    const domain = parts.join(".");
    return `${user}@${domain}`;
}

export function upnFromPersonalUrl(fullUrl: string): string | null {
    try {
        const u = new URL(fullUrl);
        const segs = u.pathname.split("/").filter(Boolean);
        if (segs[0] !== "personal") return null;
        const alias = segs[1];
        const parts = alias.split("_").filter(Boolean);
        if (parts.length < 2) return null;
        const user = parts.shift()!;
        const domain = parts.join(".");
        return `${user}@${domain}`;
    } catch {
        return null;
    }
}

function encodeDrivePath(path: string): string {
    return path
        .split("/")
        .filter(Boolean)
        .map((seg) => encodeURIComponent(seg))
        .join("/");
}

export function extractDrivePathFromSharePointUrl(fullUrl: string): string {
    const u = new URL(fullUrl);
    const expected = SITE_PATH;
    if (u.pathname.startsWith(expected + "/")) {
        const rest = u.pathname.slice(expected.length + 1);
        const decoded = decodeURIComponent(rest.replace(/^\/+/, ""));
        log("[DOWNLOAD DEBUG] Extracted drive path:", decoded);
        return decoded;
    }
    const m = /\/Documents\/.+$/i.exec(u.pathname);
    if (m) {
        const decoded = decodeURIComponent(m[0].replace(/^\/+/, ""));
        log("[DOWNLOAD DEBUG] Extracted drive path via fallback:", decoded);
        return decoded;
    }
    throw new Error(`Unable to derive drive path from URL: ${fullUrl}`);
}

async function fetchOneDriveContentByPath(
    token: string,
    upn: string,
    drivePath: string
) {
    const driveResp = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!driveResp.ok) {
        const d = await driveResp.text().catch(() => "");
        throw new Error(`Graph drive lookup error ${driveResp.status}: ${d}`);
    }
    const { id: driveId } = await driveResp.json();
    log("[GRAPH DEBUG] driveId:", driveId);

    const candidates = new Set<string>([drivePath]);
    if (/^Documents\/.+/i.test(drivePath)) {
        candidates.add(drivePath.replace(/^Documents\//i, ""));
        const segs = drivePath.split("/");
        if (segs.length > 2) {
            const first = segs[1];
            if (first.includes("_")) {
                candidates.add(drivePath.replace(first, first.replace(/_/g, " ")));
            }
            if (first.includes(" ")) {
                candidates.add(drivePath.replace(first, first.replace(/ /g, "_")));
            }
        }
    }

    let lastDetail = "";
    for (const p of candidates) {
        const encoded = encodeDrivePath(p);
        const url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
            driveId
        )}/root:/${encoded}:/content`;
        log("[GRAPH TRY]", { candidate: p, url });
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) return r;
        lastDetail = await r.text().catch(() => "");
        log("[GRAPH TRY RESULT]", { status: r.status, detail: lastDetail.slice(0, 500) });
    }

    const first = [...candidates][0];
    const parent = first.split("/").slice(0, -1).join("/");
    if (parent) {
        const listUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
            driveId
        )}/root:/${encodeDrivePath(parent)}:/children`;
        const lr = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
        const txt = await lr.text().catch(() => "");
        log("[GRAPH LIST PARENT]", { parent, status: lr.status, body: txt.slice(0, 1000) });
    }

    throw new Error(`Graph content error: all candidates failed. Last detail: ${lastDetail}`);
}

export async function streamSharePointFileByPath(
    res: any,
    drivePath: string,
    opts: {
        filename?: string;
        disposition?: "inline" | "attachment";
        fileUrl?: string;
    } = {}
) {
    const token = await graphBearer();
    const disp = opts?.disposition || "inline";
    const name = opts?.filename || drivePath.split("/").pop() || "file";

    if (SITE_PATH.startsWith("/personal/")) {
        const upnFromUrlVal = opts.fileUrl ? upnFromPersonalUrl(opts.fileUrl) : null;
        const upn = upnFromUrlVal || extractUPNFromSitePath(SITE_PATH);
        log("[GRAPH DEBUG] OneDrive personal drive detected");
        log("[GRAPH DEBUG] UPN:", upn);
        log("[GRAPH DEBUG] Drive path:", drivePath);

        const upstream = await fetchOneDriveContentByPath(token, upn, drivePath);
        if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            throw new Error(`Graph content error ${upstream.status}: ${detail}`);
        }

        // Handle redirects from Graph API to temporary download URLs
        if (upstream.status === 302 || upstream.status === 307) {
            const redirectUrl = upstream.headers.get("location");
            if (!redirectUrl) {
                throw new Error("Graph redirect missing location header");
            }
            log("[GRAPH DEBUG] Following redirect to:", redirectUrl);

            // Fetch from the redirect URL
            const redirectResponse = await fetch(redirectUrl);
            if (!redirectResponse.ok) {
                throw new Error(`Redirect fetch error ${redirectResponse.status}`);
            }

            const ct = redirectResponse.headers.get("content-type") || "application/pdf";
            const len = redirectResponse.headers.get("content-length");
            res.setHeader("Content-Type", ct);
            res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
            res.setHeader("Cache-Control", "private, no-store");
            if (len) res.setHeader("Content-Length", len);

            const body = redirectResponse.body as any; // WHATWG ReadableStream in Node 18/20
            if (!body) {
                res.end();
                return;
            }

            // If it's already a Node stream (rare), use it; otherwise convert from Web stream
            if (typeof body.pipe === "function") {
                body.pipe(res);
            } else {
                // Node 18+/20: convert WHATWG ReadableStream to Node Readable and pipe
                Readable.fromWeb(body).pipe(res);
            }
            return;
        }

        const ct = upstream.headers.get("content-type") || "application/pdf";
        const len = upstream.headers.get("content-length");
        res.setHeader("Content-Type", ct);
        res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
        res.setHeader("Cache-Control", "private, no-store");
        if (len) res.setHeader("Content-Length", len);

        const body = upstream.body as any; // WHATWG ReadableStream in Node 18/20
        if (!body) {
            res.end();
            return;
        }

        // If it's already a Node stream (rare), use it; otherwise convert from Web stream
        if (typeof body.pipe === "function") {
            body.pipe(res);
        } else {
            // Node 18+/20: convert WHATWG ReadableStream to Node Readable and pipe
            Readable.fromWeb(body).pipe(res);
        }
        return;
    }

    const contentUrl = `https://graph.microsoft.com/v1.0/sites/${HOST}:${SITE_PATH}:/drive/root:/${encodeDrivePath(
        drivePath
    )}:/content`;
    log("[GRAPH DEBUG] SharePoint site drive detected");
    log("[GRAPH DEBUG] Graph URL:", contentUrl);
    const upstream = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        throw new Error(`Graph content error ${upstream.status}: ${detail}`);
    }

    // Handle redirects from Graph API to temporary download URLs
    if (upstream.status === 302 || upstream.status === 307) {
        const redirectUrl = upstream.headers.get("location");
        if (!redirectUrl) {
            throw new Error("Graph redirect missing location header");
        }
        log("[GRAPH DEBUG] Following redirect to:", redirectUrl);

        // Fetch from the redirect URL
        const redirectResponse = await fetch(redirectUrl);
        if (!redirectResponse.ok) {
            throw new Error(`Redirect fetch error ${redirectResponse.status}`);
        }

        const ct = redirectResponse.headers.get("content-type") || "application/pdf";
        const len = redirectResponse.headers.get("content-length");
        res.setHeader("Content-Type", ct);
        res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
        res.setHeader("Cache-Control", "private, no-store");
        if (len) res.setHeader("Content-Length", len);

        const body = redirectResponse.body as any; // WHATWG ReadableStream in Node 18/20
        if (!body) {
            res.end();
            return;
        }

        // If it's already a Node stream (rare), use it; otherwise convert from Web stream
        if (typeof body.pipe === "function") {
            body.pipe(res);
        } else {
            // Node 18+/20: convert WHATWG ReadableStream to Node Readable and pipe
            Readable.fromWeb(body).pipe(res);
        }
        return;
    }

    const ct = upstream.headers.get("content-type") || "application/pdf";
    const len = upstream.headers.get("content-length");
    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
    res.setHeader("Cache-Control", "private, no-store");
    if (len) res.setHeader("Content-Length", len);

    const body = upstream.body as any; // WHATWG ReadableStream in Node 18/20
    if (!body) {
        res.end();
        return;
    }

    // If it's already a Node stream (rare), use it; otherwise convert from Web stream
    if (typeof body.pipe === "function") {
        body.pipe(res);
    } else {
        // Node 18+/20: convert WHATWG ReadableStream to Node Readable and pipe
        Readable.fromWeb(body).pipe(res);
    }
}


