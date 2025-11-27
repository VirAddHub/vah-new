import "isomorphic-fetch";

let cached: { token: string; exp: number } | null = null;

async function fetchAppToken(): Promise<string> {
    const tenant = process.env.GRAPH_TENANT_ID!;
    const body = new URLSearchParams({
        client_id: process.env.GRAPH_CLIENT_ID!,
        client_secret: process.env.GRAPH_CLIENT_SECRET!,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
    });

    const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!resp.ok) throw new Error(`Graph token error ${resp.status}`);
    const json = await resp.json();
    const now = Math.floor(Date.now() / 1000);
    cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
    return cached.token;
}

export async function graphBearer(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp - 60 > now) return cached.token;
    return fetchAppToken();
}
