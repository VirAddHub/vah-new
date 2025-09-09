'use client';

import { useEffect, useState } from 'react';

type Status = {
  pid: number;
  dir: string;
  usingDistDb: boolean;
  haveCsrf: boolean;
  branch?: string;
  commit?: string;
  node?: string;
  routes?: string[];
} | null;

export default function DebugStatus() {
  const [status, setStatus] = useState<Status>(null);
  const [csrf, setCsrf] = useState<any>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const s = await fetch(`${process.env.NEXT_PUBLIC_API_ORIGIN}/__status`, { credentials: 'include' });
        if (s.ok) setStatus(await s.json());
        const c = await fetch(`${process.env.NEXT_PUBLIC_API_ORIGIN}/api/csrf`, { credentials: 'include' });
        if (c.ok) setCsrf(await c.json());
      } catch (e: any) {
        setErr(e?.message ?? 'fetch failed');
      }
    })();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">API Debug</h1>
      <p className="text-sm text-gray-600">API Base: <code>{process.env.NEXT_PUBLIC_API_ORIGIN}</code></p>
      {err && <p className="text-red-600">{err}</p>}
      <section>
        <h2 className="font-medium mb-2">Status (/__status)</h2>
        <pre className="text-sm bg-gray-50 border p-3 rounded overflow-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-medium mb-2">CSRF (/api/csrf)</h2>
        <pre className="text-sm bg-gray-50 border p-3 rounded overflow-auto">
          {JSON.stringify(csrf, null, 2)}
        </pre>
      </section>
    </main>
  );
}
