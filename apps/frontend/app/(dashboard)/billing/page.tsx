'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useState } from 'react';

const money = (p?: number) => typeof p === 'number' ? `£${(p / 100).toFixed(2)}` : '—';
const formatDateUK = (v?: number | string | null) => {
  if (v == null) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  const d = !Number.isNaN(n) && n > 10_000_000_000 ? new Date(n) : new Date(v as any);
  return Number.isNaN(d.getTime()) ? '—' :
    new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(d);
};

export default function BillingPage() {
  const { data: overview } = useSWR('/api/bff/billing/overview', swrFetcher);
  const { data: invoices } = useSWR('/api/bff/billing/invoices?page=1&page_size=12', swrFetcher);
  const [busy, setBusy] = useState<string | null>(null);

  const o = overview?.data;
  const items = invoices?.data?.items ?? [];

  const act = async (path: string) => {
    setBusy(path);
    try {
      const r = await fetch(path, { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (j?.data?.redirect_url) window.location.href = j.data.redirect_url;
    } finally {
      setBusy(null);
    }
  };

  const handlePlanChange = async (cadence: 'monthly' | 'yearly') => {
    setBusy(cadence);
    try {
      const planId = cadence === 'monthly' ? 3 : 2; // Plan IDs from database
      const r = await fetch('/api/bff/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_id: planId })
      });

      const j = await r.json();
      if (j.ok) {
        // Refresh the page to show updated plan
        window.location.reload();
      } else {
        alert('Failed to change plan. Please try again.');
      }
    } catch (error) {
      alert('Failed to change plan. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Billing</h1>

      {/* Payment Status Alerts */}
      {o?.account_status === 'grace_period' && o?.grace_period && (
        <div className="rounded-xl p-4 border border-amber-300 bg-amber-50">
          <div className="font-medium">Payment Failed - Grace Period</div>
          <div className="text-sm mt-1">
            Your payment failed, but you have {o.grace_period.days_left} days to update your payment method.
            This is attempt #{o.grace_period.retry_count + 1}.
          </div>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-amber-600 text-white"
              onClick={() => act('/api/bff/billing/reauthorise')}
              disabled={busy !== null}>
              Update Payment Method
            </button>
            <button className="px-3 py-2 rounded-lg border border-amber-600 text-amber-600"
              onClick={() => act('/api/bff/billing/update-bank')}
              disabled={busy !== null}>
              Update Bank Details
            </button>
          </div>
        </div>
      )}

      {o?.account_status === 'past_due' && (
        <div className="rounded-xl p-4 border border-red-300 bg-red-50">
          <div className="font-medium">Payment Overdue</div>
          <div className="text-sm mt-1">Your payment is overdue. Please update your payment method immediately to avoid service interruption.</div>
          <div className="mt-3">
            <button className="px-3 py-2 rounded-lg bg-red-600 text-white"
              onClick={() => act('/api/bff/billing/reauthorise')}
              disabled={busy !== null}>
              Update Payment Method
            </button>
          </div>
        </div>
      )}

      {o?.account_status === 'suspended' && (
        <div className="rounded-xl p-4 border border-red-300 bg-red-50">
          <div className="font-medium">Account Suspended</div>
          <div className="text-sm mt-1">Your account has been suspended due to payment issues. Please contact support to restore service.</div>
        </div>
      )}

      {o?.status && o.status !== 'active' && o?.account_status === 'active' && (
        <div className="rounded-xl p-4 border border-amber-300 bg-amber-50">
          <div className="font-medium">Payment issue</div>
          <div className="text-sm mt-1">Your Direct Debit is {o.status}. Please re-authorise to avoid service interruption.</div>
          <div className="mt-3">
            <button className="px-3 py-2 rounded-lg bg-amber-600 text-white"
              onClick={() => act('/api/bff/billing/reauthorise')}
              disabled={busy !== null}>
              Re-authorise Direct Debit
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Plan</div>
          <div className="text-lg font-medium">{o?.plan ?? 'Digital Mailbox Plan'}</div>
          <div className="text-sm text-gray-500 mt-1">Cadence: {o?.cadence ?? 'monthly'}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Next charge</div>
          <div className="text-lg font-medium">{o?.next_charge_at ? formatDateUK(o.next_charge_at) : '—'}</div>
          <div className="text-sm text-gray-500 mt-1">Status: {o?.status ?? '—'}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">This month's usage</div>
          <div className="text-lg font-medium">{money(o?.usage?.amount_pence)} <span className="text-sm text-gray-500">({o?.usage?.qty ?? 0} items)</span></div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm text-gray-700 font-medium mb-3">Actions</div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 rounded-lg border"
            onClick={() => act('/api/bff/billing/update-bank')}
            disabled={busy !== null}>Update bank details</button>

          <button className="px-3 py-2 rounded-lg border"
            onClick={() => act('/api/bff/billing/reauthorise')}
            disabled={busy !== null}>Re-authorise mandate</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Secure pages are provided by GoCardless. We'll refresh your mandate and billing automatically.
        </p>
      </div>

      {/* Billing Frequency Section */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-gray-700 font-medium mb-3">Billing Frequency</div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Monthly Plan */}
          <div className={`rounded-lg border p-4 ${o?.cadence === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">Virtual Mailbox - Monthly</h3>
              {o?.cadence === 'monthly' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>}
            </div>
            <div className="text-2xl font-bold mb-1">
              {o?.cadence === 'monthly' ? `£${(o?.current_price_pence || 995) / 100}` : '£9.95'}
            </div>
            <div className="text-sm text-gray-500 mb-3">per month</div>
            <ul className="text-xs text-gray-600 space-y-1 mb-4">
              <li>• Professional London business address</li>
              <li>• Unlimited digital mail scanning</li>
              <li>• HMRC & Companies House forwarding (free)</li>
              <li>• Cancel anytime</li>
            </ul>
            {o?.cadence !== 'monthly' && (
              <button
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                onClick={() => handlePlanChange('monthly')}
                disabled={busy !== null}
              >
                {busy === 'monthly' ? 'Processing...' : 'Choose Monthly Billing'}
              </button>
            )}
          </div>

          {/* Annual Plan */}
          <div className={`rounded-lg border p-4 ${o?.cadence === 'yearly' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">Virtual Mailbox - Annual</h3>
              {o?.cadence === 'yearly' && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current</span>}
            </div>
            <div className="text-2xl font-bold mb-1">
              {o?.cadence === 'yearly' ? `£${(o?.current_price_pence || 8999) / 100}` : '£89.99'}
            </div>
            <div className="text-sm text-gray-500 mb-1">per year</div>
            <div className="text-sm text-green-600 font-medium mb-3">
              Save 25% (£29.41/year) - Same service, better value
            </div>
            <ul className="text-xs text-gray-600 space-y-1 mb-4">
              <li>• Professional London business address</li>
              <li>• Unlimited digital mail scanning</li>
              <li>• HMRC & Companies House forwarding (free)</li>
              <li>• Cancel anytime</li>
              <li>• <strong>25% savings vs monthly</strong></li>
            </ul>
            {o?.cadence !== 'yearly' && (
              <button
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                onClick={() => handlePlanChange('yearly')}
                disabled={busy !== null}
              >
                {busy === 'yearly' ? 'Processing...' : 'Choose Annual Billing'}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Billing frequency changes take effect immediately. You'll be charged the new rate on your next billing cycle.
        </p>
      </div>

      <div className="rounded-2xl border">
        <div className="p-4 border-b text-sm text-gray-700 font-medium">Invoices & receipts</div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Date</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className="py-6 text-gray-500" colSpan={4}>No invoices yet.</td></tr>
              ) : items.map((x: any) => (
                <tr key={x.id} className="border-t">
                  <td className="py-2">{formatDateUK(x.date)}</td>
                  <td className="py-2">{money(x.amount_pence)}</td>
                  <td className="py-2">{x.status}</td>
                  <td className="py-2">
                    {x.pdf_url ? <a className="underline" href={x.pdf_url} target="_blank" rel="noreferrer">Download PDF</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
