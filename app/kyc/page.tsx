'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function KycPage() {
  const [status, setStatus] = useState<any>(null);
  useEffect(()=>{ api.get('/api/kyc/status').then((r:any)=>setStatus(r?.data||null)); }, []);
  async function start() { await api.post('/api/kyc/upload', {}); location.reload(); }
  return (
    <div className="space-y-3">
      <h1 className="text-2xl">KYC</h1>
      <pre className="bg-white/5 p-3 rounded">{JSON.stringify(status, null, 2)}</pre>
      <Button onClick={start}>Start / Retry</Button>
    </div>
  );
}
