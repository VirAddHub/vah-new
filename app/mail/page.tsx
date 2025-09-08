'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import Spinner from '@/components/ui/Spinner';

type Mail = {
  id: number;
  subject: string;
  received_date?: string; // ISO or displayable
  tag?: string;
};

type SortKey = 'subject' | 'received_date' | 'tag';
type SortDir = 'asc' | 'desc';

export default function MailListPage() {
  const [rows, setRows] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('received_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  async function load() {
    setLoading(true); setErr(null);
    try {
      const data = await api.get<Mail[]>('/mail');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load mail.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = term
      ? rows.filter(r =>
          (r.subject || '').toLowerCase().includes(term) ||
          (r.tag || '').toLowerCase().includes(term),
        )
      : rows.slice();

    out.sort((a, b) => {
      const A = (a[sortKey] ?? '').toString().toLowerCase();
      const B = (b[sortKey] ?? '').toString().toLowerCase();
      if (A === B) return 0;
      const cmp = A > B ? 1 : -1;
      return sortDir === 'asc' ? cmp : -1 * cmp;
    });

    return out;
  }, [rows, q, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function onForward(id: number) {
    if (!confirm('Request physical forwarding for this mail item?')) return;
    try {
      await api.post(`/mail/${id}/forward-request`, {});
      alert('Forwarding requested.');
    } catch (e: any) {
      alert(e?.message ?? 'Failed to request forwarding.');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this mail item? This may be irreversible.')) return;
    try {
      await api.del(`/mail/${id}`);
      setRows(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete.');
    }
  }

  if (loading) return <MailListLoading />;
  if (err) return <MailListError message={err} onRetry={load} />;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mail</h1>
        <button onClick={load} className="border rounded px-3 py-2 text-sm inline-flex gap-2 items-center">
          <Spinner /> <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search subject or tag…"
          className="w-full md:w-80 rounded border p-2 text-sm"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Sort:</span>
          <SortButton currentKey={sortKey} currentDir={sortDir} myKey="received_date" onClick={toggleSort}>
            Received
          </SortButton>
          <SortButton currentKey={sortKey} currentDir={sortDir} myKey="subject" onClick={toggleSort}>
            Subject
          </SortButton>
          <SortButton currentKey={sortKey} currentDir={sortDir} myKey="tag" onClick={toggleSort}>
            Tag
          </SortButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded p-6 text-sm">
          <p className="font-medium mb-1">No mail found</p>
          <p className="opacity-70">Try clearing the search or refreshing.</p>
        </div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-2">Subject</th>
                <th className="text-left p-2">Received</th>
                <th className="text-left p-2">Tag</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <Link href={`/mail/${m.id}`} className="underline">{m.subject}</Link>
                  </td>
                  <td className="p-2">{m.received_date ?? '-'}</td>
                  <td className="p-2">
                    {m.tag ? <span className="inline-block px-2 py-0.5 rounded-full border text-xs">{m.tag}</span> : '-'}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-3">
                      <Link className="underline" href={`/mail/${m.id}`}>View</Link>
                      <button onClick={() => onForward(m.id)} className="underline">Forward</button>
                      <button onClick={() => onDelete(m.id)} className="text-red-600 underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function SortButton({
  currentKey, currentDir, myKey, onClick, children,
}: {
  currentKey: SortKey; currentDir: SortDir; myKey: SortKey; onClick: (k: SortKey) => void; children: React.ReactNode;
}) {
  const active = currentKey === myKey;
  return (
    <button
      onClick={() => onClick(myKey)}
      className={`px-2 py-1 rounded border ${active ? 'font-medium' : 'opacity-70'}`}
      title={`Sort by ${String(children)}`}
    >
      {children}{' '}{active ? (currentDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  );
}

/** lightweight loading & error UIs */
function MailListLoading() {
  return (
    <main className="p-6 space-y-4">
      <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="h-9 w-full md:w-80 bg-gray-200 rounded animate-pulse" />
      <div className="border rounded">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 border-b animate-pulse" />
        ))}
      </div>
    </main>
  );
}

function MailListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Mail</h1>
      <div className="border rounded p-4">
        <p className="text-red-600 text-sm mb-2">Error: {message}</p>
        <button onClick={onRetry} className="border rounded px-3 py-2 text-sm">Retry</button>
      </div>
    </main>
  );
}
