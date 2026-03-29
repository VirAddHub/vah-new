/**
 * Browser console helpers gated to development only.
 * Avoids leaking implementation details, payloads, or errors from production users' consoles.
 */
const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (isDev) console.error(...args);
}
