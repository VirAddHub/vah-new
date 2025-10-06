import { graphBearer } from "../lib/graph";

const HOST = process.env.GRAPH_SITE_HOST!;
const SITE_PATH = process.env.GRAPH_SITE_PATH!; // e.g. /personal/ops_virtualaddresshub_co_uk

// In: https://.../personal/ops_.../Documents/Scanned_Mail/user4_1111_bilan.pdf
// Out: Documents/Scanned_Mail/user4_1111_bilan.pdf
export function extractDrivePathFromSharePointUrl(fullUrl: string): string {
    const u = new URL(fullUrl);
    const expectedPrefix = SITE_PATH.replace(/\/+$/, "");
    if (u.pathname.startsWith(expectedPrefix + "/")) {
        return decodeURIComponent(u.pathname.slice(expectedPrefix.length + 1).replace(/^\/+/, ""));
    }
    const m = /\/Documents\/.+$/i.exec(u.pathname);
    if (m) return decodeURIComponent(m[0].replace(/^\/+/, ""));
    throw new Error("Unable to derive drive path from SharePoint URL");
}

export async function streamSharePointFileByPath(
    res: any,
    drivePath: string,
    opts?: { filename?: string; disposition?: "inline" | "attachment" }
) {
    const token = await graphBearer();
    const url = `https://graph.microsoft.com/v1.0/sites/${HOST}:${SITE_PATH}:/drive/root:/${encodeURI(drivePath)}:/content`;

    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!upstream.ok) throw new Error(`Graph content error ${upstream.status}`);

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const name = opts?.filename || drivePath.split("/").pop() || "file";
    const disp = opts?.disposition || "inline";

    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `${disp}; filename="${name}"`);
    res.setHeader("Cache-Control", "private, no-store");

    // @ts-ignore Node fetch Readable -> pipe
    upstream.body.pipe(res);
}
