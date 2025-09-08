'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { MailItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export default function MailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<MailItem | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { api.get(`/api/mail-items/${id}`).then((r:any)=>setItem(r?.data||null)); }, [id]);

  async function requestForward() {
    const res = await api.post('/api/forwarding-requests', { mail_item_id: Number(id) });
    setMsg(('ok' in res && res.ok) ? 'Forwarding requested' : ((res as any).error||'Failed'));
  }

  if (!item) return <p>Loading…</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl">{item.subject || 'Mail item'}</h1>
      <p className="opacity-70">From: {item.sender_name || 'Unknown'}</p>
      <p className="opacity-70">Status: {item.status}</p>
      {item.scan_file_url && <a className="underline" href={`/api/proxy?src=${encodeURIComponent(item.scan_file_url)}`} target="_blank">View scan</a>}
      {msg && <p className="text-sm opacity-80">{msg}</p>}
      <Button onClick={requestForward}>Request forwarding</Button>
    </div>
  );
}
