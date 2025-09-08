'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DebugPage() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get('/health')
      .then(setOut)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Debug</h1>
      <p>API Base: <code>{process.env.NEXT_PUBLIC_API_BASE}</code></p>
      {err ? <pre className="text-red-600">{err}</pre> : <pre>{JSON.stringify(out, null, 2)}</pre>}
    </main>
  );
}
