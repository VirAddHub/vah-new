// apps/frontend/lib/ready.ts
export async function pingReady() {
  const url = process.env.NEXT_PUBLIC_READY_URL;
  if (!url) return;
  try {
    await fetch(url, { cache: 'no-store' });
  } catch {
    // ignore
  }
}
