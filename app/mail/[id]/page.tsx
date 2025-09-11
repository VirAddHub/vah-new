'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { MailItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export default function MailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<MailItem | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { api.get(`/api/mail-items/${id}`).then((r: any) => setItem(r?.data || null)); }, [id]);

  const daysOld = useMemo(() => {
    if (!item || !('received_date' in item) || !item.received_date) return 0;
    return Math.floor((Date.now() - new Date((item as any).received_date).getTime()) / (1000 * 60 * 60 * 24));
  }, [item]);

  const canForward = daysOld <= 14; // synced with backend default

  async function requestForward() {
    const res = await api.post('/api/forwarding-requests', { mail_item_id: Number(id) });
    setMsg(('ok' in res && res.ok) ? 'Forwarding requested' : ((res as any).error || 'Failed'));
  }

  if (!item) return <p>Loading…</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl">{item.subject || 'Mail item'}</h1>
      <p className="opacity-70">From: {item.sender_name || 'Unknown'}</p>
      <p className="opacity-70">Status: {item.status}</p>
      {item.scan_file_url && <a className="underline" href={`/api/proxy?src=${encodeURIComponent(item.scan_file_url)}`} target="_blank">View scan</a>}
      {msg && <p className="text-sm opacity-80">{msg}</p>}

      <div className="flex gap-2">
        <a className="btn" href={`/api/mail-items/${item.id}/scan-url`}>Open Scan</a>
        <button
          className="btn"
          disabled={!canForward}
          title={!canForward ? 'Forwarding is available for 14 days from receipt. You can always download the scan.' : ''}
          onClick={requestForward}
        >
          Forward
        </button>
      </div>

      {!canForward && (
        <p className="text-sm text-yellow-600">
          This item is {daysOld} days old. Physical forwarding is unavailable; download remains available.
        </p>
      )}
    </div>
  );
}
