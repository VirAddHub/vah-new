// apps/frontend/lib/ready.ts
export async function pingReady() {
  const url = process.env.NEXT_PUBLIC_READY_URL;
  // Only call if explicitly provided AND looks like an absolute http(s) URL.
  if (!url || !/^https?:\/\//i.test(url)) return;
  try {
    await fetch(url, { cache: 'no-store' });
  } catch {
    // swallow; diagnostics only
  }
}
