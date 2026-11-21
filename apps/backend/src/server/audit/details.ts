/** Read-time normalization only: never rewrite historical records. */
export function parseAuditValue(value: unknown): unknown {
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    if (!value.trim()) return null;
    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }
  return value ?? null;
}

const sensitiveKey =
  /password|passwd|token|secret|authorization|cookie|credential|api.?key|private.?key|reset.?link|session|otp|totp|recovery.?code/i;
const sensitiveText =
  /(?:password|passwd|token|secret|authorization|cookie|credential|api.?key|private.?key|otp)\s*["']?\s*(?:[:=]|is\s)|(?:bearer|basic)\s+\S+|https?:\/\/[^\s/]+:[^\s/]+@|-----BEGIN .*PRIVATE KEY|\beyJ[\w-]+\.[\w-]+\.[\w-]+/i;
const authFields = new Set([
  'reason',
  'outcome',
  'status',
  'method',
  'provider',
  'email',
  'user_id',
  'actor_id',
]);

export function safeAuditValue(raw: unknown, authentication = false, depth = 0): unknown {
  if (depth > 8) return '[Details too deeply nested]';
  const value = parseAuditValue(raw);
  if (value == null) return null;
  if (typeof value === 'string') {
    // Opaque authentication payloads are intentionally never returned.
    if (authentication || sensitiveText.test(value)) return '[Sensitive details hidden]';
    // Broken JSON cannot be safely inspected for sensitive fields.
    if (/^[\[{]/.test(value.trim())) return '[Malformed details; original record retained]';
    return value.slice(0, 5000);
  }
  if (Array.isArray(value))
    return authentication
      ? null
      : value.slice(0, 100).map((v) => safeAuditValue(v, false, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 100)
        .flatMap(([key, v]) => {
          if (sensitiveKey.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key))
            return [[key, '[Redacted]']];
          if (authentication && !authFields.has(key)) return [];
          // Auth allowlist values must be scalar; never allow nested payloads through it.
          const parsed = parseAuditValue(v);
          if (authentication && typeof parsed === 'object' && parsed !== null) return [];
          return [[key, safeAuditValue(v, false, depth + 1)]];
        }),
    );
  }
  return typeof value === 'boolean' || typeof value === 'number' ? value : null;
}
