const fetch = (...args) => import("node-fetch").then(m => m.default(...args));

function baseUrl() {
  if (process.env.GC_API) return process.env.GC_API;
  return (process.env.GC_ENV || "sandbox") === "live"
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";
}

const VERSION = process.env.GC_VERSION || "2015-07-06";

async function gcFetch(method, path, bodyObj) {
  const token = process.env.GC_ACCESS_TOKEN || "";
  if (!token) throw new Error("GC_ACCESS_TOKEN missing");
  const url = `${baseUrl()}${path}`;
  const body = bodyObj ? JSON.stringify(bodyObj) : undefined;

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "GoCardless-Version": VERSION,
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`GC ${method} ${path} ${res.status}: ${text}`);
  }
  return json;
}

module.exports = { gcFetch };
