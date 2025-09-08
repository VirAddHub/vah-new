'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Payment = {
  id: number;
  created_at?: number;
  status?: string;
  invoice_url?: string;
};

export default function BillingPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Payment[]>('/payments')
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6">Loading…</main>;
  if (err) return <main className="p-6 text-red-600">{err}</main>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Billing</h1>
      {rows.length === 0 ? (
        <p>No payments yet.</p>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                <td className="p-2">{p.status ?? '-'}</td>
                <td className="p-2">
                  {p.invoice_url ? <a className="underline" href={p.invoice_url} target="_blank">Open</a> : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
