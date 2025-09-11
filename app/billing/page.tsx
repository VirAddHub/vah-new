'use client';

import { useEffect, useState } from 'react';
import DownloadInvoiceButton from '@/components/billing/DownloadInvoiceButton';

type Invoice = {
  id: number;
  number: string;
  amount_pence: number;
  currency: string;
  period_start: string;
  period_end: string;
  created_at: string;
};

function fmtGBP(pennies: number) {
  return `£${(pennies / 100).toFixed(2)}`;
}
function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // BFF passthrough keeps cookies/session
        const res = await fetch(`/api/bff/billing/invoices`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load invoices`);
        const j = await res.json();
        setInvoices(j.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Billing</h1>
      <p className="text-sm text-gray-600 mb-6">Your invoices appear below. Download links are single-use and expire shortly.</p>

      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm">{error}</div>}
      {loading ? <div>Loading…</div> : (
        invoices.length === 0 ? <div>No invoices yet.</div> : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Invoice #</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Period</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-2">{fmtDate(inv.created_at)}</td>
                    <td className="px-4 py-2">{fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}</td>
                    <td className="px-4 py-2">{fmtGBP(inv.amount_pence)}</td>
                    <td className="px-4 py-2">
                      <DownloadInvoiceButton invoiceId={inv.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}