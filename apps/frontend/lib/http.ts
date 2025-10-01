// apps/frontend/lib/http.ts
export async function safeJson(res: Response): Promise<any> {
  // 204 No Content or zero length → return null
  if (res.status === 204) return null;

  const len = res.headers.get('content-length');
  if (len === '0') return null;

  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('application/json')) {
    // If it's not JSON, try text. Empty text -> null
    const text = await res.text().catch(() => '');
    if (!text) return null;
    try { return JSON.parse(text); } catch {
      // Not JSON, return raw text so callers can branch if they care
      return { _nonJson: true, text };
    }
  }

  // It says JSON — but it might still be empty (streamed / buggy server)
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch {
    // Last resort: return the raw text wrapped so we don't explode
    return { _jsonParseError: true, text };
  }
}

// Safe parse helper for localStorage values
export function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
