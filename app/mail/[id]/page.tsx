'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { MailItem } from '@/lib/types';
import Callout from '@/app/components/Callout';
import ForwardingActions from './ForwardingActions';

export default function MailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<MailItem | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/mail-items/${id}`).then((r: any) => setItem(r?.data || null));
    api.get('/api/profile').then((r: any) => setProfile(r?.data || null));
  }, [id]);

  const daysOld = useMemo(() => {
    if (!item || !('received_date' in item) || !item.received_date) return 0;
    return Math.floor((Date.now() - new Date((item as any).received_date).getTime()) / (1000 * 60 * 60 * 24));
  }, [item]);

  const tag = item?.tag ?? null;
  const qualifiesFree = tag === 'HMRC' || tag === 'Companies House';
  const kycApproved = profile?.kyc_status === 'approved';
  const eligibleByAge = daysOld <= 14;

  if (!item) return <p>Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">{item.subject || 'Mail item'}</h1>
      <p className="opacity-70">From: {item.sender_name || 'Unknown'}</p>
      <p className="opacity-70">Status: {item.status}</p>
      {item.tag && <p className="opacity-70">Tag: {item.tag}</p>}

      {qualifiesFree && (
        <Callout tone="success">
          <strong>This letter qualifies for free forwarding.</strong> We'll send it at <strong>no cost</strong>.
        </Callout>
      )}

      <div className="flex gap-2">
        <button
          id="open-scan-url"
          data-url={`/api/mail-items/${item.id}/scan-url`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => {
            const url = document.getElementById('open-scan-url')?.getAttribute('data-url');
            if (url) window.open(url, '_blank');
          }}
        >
          Open scan
        </button>

        <ForwardingActions
          mailId={id}
          tag={tag}
          kycApproved={kycApproved}
          eligibleByAge={eligibleByAge}
        />
      </div>

      {!eligibleByAge && (
        <p className="text-sm text-yellow-600">
          This item is {daysOld} days old. Physical forwarding is unavailable; download remains available.
        </p>
      )}
    </div>
  );
}
