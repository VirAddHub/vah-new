'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function TicketsPage() {
  const [list, setList] = useState<any[]>([]);
  const [subject, setSubject] = useState('');

  async function createTicket() {
    const res = await api.post('/api/support/tickets', { subject, message: '' });
    if ('ok' in res && res.ok) window.location.href = `/support/tickets/${(res as any).data?.ticket_id}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Support tickets</h1>
      <div className="flex gap-2 max-w-lg">
        <Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" />
        <Button onClick={createTicket} disabled={!subject.trim()}>Create</Button>
      </div>
      {!list.length && <p className="opacity-70">Tickets will appear here.</p>}
      <ul className="space-y-2">
        {list.map(t=>(
          <li key={t.id} className="bg-white/10 p-3 rounded">
            <Link href={`/support/tickets/${t.id}`} className="underline">{t.subject}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
