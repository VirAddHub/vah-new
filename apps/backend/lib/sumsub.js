const crypto = require("crypto");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));

// Support both old and new env var names for backward compatibility
const SUMSUB_API = process.env.SUMSUB_BASE_URL || process.env.SUMSUB_API || "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "";
const APP_SECRET = process.env.SUMSUB_APP_SECRET || process.env.SUMSUB_SECRET_KEY || "";

/**
 * Sign Sumsub API requests with HMAC-SHA256
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {string} ts - Timestamp
 * @param {string} body - Request body
 * @returns {string} Hex signature
 */
function sign(method, path, ts, body = "") {
  const hmac = crypto.createHmac("sha256", APP_SECRET);
  hmac.update(`${ts}${method}${path}${body}`);
  return hmac.digest("hex");
}

/**
 * Make authenticated requests to Sumsub API
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {object} bodyObj - Request body object
 * @returns {Promise<object|null>} Response data or null for empty responses
 */
async function sumsubFetch(method, path, bodyObj) {
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
  
  // Some endpoints return empty bodies; guard parse
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

module.exports = { sumsubFetch };
