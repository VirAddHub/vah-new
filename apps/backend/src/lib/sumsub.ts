import crypto from 'crypto';

// Use global fetch, natively supported in Node 18+
const SUMSUB_API =
  process.env.SUMSUB_BASE_URL ||
  process.env.SUMSUB_API ||
  process.env.SUMSUB_BASE_URL_SANDBOX ||
  process.env.SUMSUB_API_SANDBOX ||
  "https://api.sumsub.com";

const APP_TOKEN =
  process.env.SUMSUB_APP_TOKEN ||
  process.env.SUMSUB_APP_TOKEN_SANDBOX ||
  "";

const APP_SECRET =
  process.env.SUMSUB_APP_SECRET ||
  process.env.SUMSUB_SECRET_KEY ||
  process.env.SUMSUB_SECRET_KEY_SANDBOX ||
  "";

/**
 * Sign Sumsub API requests with HMAC-SHA256
 */
function sign(method: string, path: string, ts: string, body: string = ""): string {
  const hmac = crypto.createHmac("sha256", APP_SECRET);
  hmac.update(`${ts}${method}${path}${body}`);
  return hmac.digest("hex");
}

/**
 * Make authenticated requests to Sumsub API
 */
export async function sumsubFetch(method: string, path: string, bodyObj?: any): Promise<any> {
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = sign(method, path, ts, body);

  const res = await fetch(`${SUMSUB_API}${path}`, {
    method,
    headers: {
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": ts,
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sumsub ${method} ${path} ${res.status}: ${text}`);
  }
  
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}
