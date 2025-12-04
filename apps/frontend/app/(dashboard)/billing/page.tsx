'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { getToken } from '@/lib/token-manager';
import { usePlans } from '@/hooks/usePlans';

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

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
  
  // Get dynamic pricing from plans API
  const { getMonthlyPlan, getAnnualPlan } = usePlans();
  const monthlyPlan = getMonthlyPlan();
  const annualPlan = getAnnualPlan();
  const monthlyPrice = monthlyPlan ? (monthlyPlan.price_pence / 100).toFixed(2) : null;
  const annualPrice = annualPlan ? (annualPlan.price_pence / 100).toFixed(2) : null;

  const o = overview?.data;
  const items = invoices?.data?.items ?? [];

  const act = async (path: string) => {
    setBusy(path);
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const r = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
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
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const r = await fetch(`${API_BASE}/api/billing/change-plan`, {
        method: 'POST',
        headers,
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation onNavigate={() => { }} />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>

          {/* Payment Status Alerts */}
          {o?.account_status === 'grace_period' && o?.grace_period && (
            <div className="rounded-xl p-4 border border-amber-500 bg-amber-100 dark:bg-amber-900/20 dark:border-amber-400">
              <div className="font-semibold text-amber-900 dark:text-amber-100">Payment Failed - Grace Period</div>
              <div className="text-sm mt-1 text-amber-800 dark:text-amber-200">
                Your payment failed, but you have {o.grace_period.days_left} days to update your payment method.
                This is attempt #{o.grace_period.retry_count + 1}.
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={() => act('/api/billing/reauthorise')}
                  disabled={busy !== null}>
                  Update Payment Method
                </button>
                <button className="px-3 py-2 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium"
                  onClick={() => act('/api/billing/update-bank')}
                  disabled={busy !== null}>
                  Update Bank Details
                </button>
              </div>
            </div>
          )}

          {o?.account_status === 'past_due' && (
            <div className="rounded-xl p-4 border border-red-500 bg-red-100 dark:bg-red-900/20 dark:border-red-400">
              <div className="font-semibold text-red-900 dark:text-red-100">Payment Overdue</div>
              <div className="text-sm mt-1 text-red-800 dark:text-red-200">Your payment is overdue. Please update your payment method immediately to avoid service interruption.</div>
              <div className="mt-3">
                <button className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                  onClick={() => act('/api/billing/reauthorise')}
                  disabled={busy !== null}>
                  Update Payment Method
                </button>
              </div>
            </div>
          )}

          {o?.account_status === 'suspended' && (
            <div className="rounded-xl p-4 border border-red-500 bg-red-100 dark:bg-red-900/20 dark:border-red-400">
              <div className="font-semibold text-red-900 dark:text-red-100">Account Suspended</div>
              <div className="text-sm mt-1 text-red-800 dark:text-red-200">Your account has been suspended due to payment issues. Please contact support to restore service.</div>
            </div>
          )}

          {o?.status && o.status !== 'active' && o?.account_status === 'active' && (
            <div className="rounded-xl p-4 border border-amber-500 bg-amber-100 dark:bg-amber-900/20 dark:border-amber-400">
              <div className="font-semibold text-amber-900 dark:text-amber-100">Payment issue</div>
              <div className="text-sm mt-1 text-amber-800 dark:text-amber-200">Your Direct Debit is {o.status}. Please re-authorise to avoid service interruption.</div>
              <div className="mt-3">
                <button className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={() => act('/api/billing/reauthorise')}
                  disabled={busy !== null}>
                  Re-authorise Direct Debit
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground font-medium">Plan</div>
              <div className="text-xl font-bold text-foreground mt-1">{o?.plan ?? 'Digital Mailbox Plan'}</div>
              <div className="text-sm text-muted-foreground mt-2">Cadence: {o?.cadence ?? 'monthly'}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground font-medium">Next charge</div>
              <div className="text-xl font-bold text-foreground mt-1">{o?.next_charge_at ? formatDateUK(o.next_charge_at) : '—'}</div>
              <div className="text-sm text-muted-foreground mt-2">Status: {o?.status ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground font-medium">This month's usage</div>
              <div className="text-xl font-bold text-foreground mt-1">{money(o?.usage?.amount_pence)} <span className="text-sm text-muted-foreground">({o?.usage?.qty ?? 0} items)</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-lg font-semibold text-foreground mb-4">Actions</div>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium"
                onClick={() => act('/api/billing/update-bank')}
                disabled={busy !== null}>Update bank details</button>

              <button className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium"
                onClick={() => act('/api/billing/reauthorise')}
                disabled={busy !== null}>Re-authorise mandate</button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Secure pages are provided by GoCardless. We'll refresh your mandate and billing automatically.
            </p>
          </div>

          {/* Billing Frequency Section */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-lg font-semibold text-foreground mb-6">Billing Frequency</div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Plan */}
              <div className={`rounded-lg border p-6 ${o?.cadence === 'monthly' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-border bg-card'}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-foreground">Virtual Mailbox - Monthly</h3>
                  {o?.cadence === 'monthly' && <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded font-medium">Current</span>}
                </div>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {o?.cadence === 'monthly' 
                    ? `£${(o?.current_price_pence || (monthlyPlan?.price_pence || 995)) / 100}` 
                    : monthlyPrice ? `£${monthlyPrice}` : 'Loading...'}
                </div>
                <div className="text-sm text-muted-foreground mb-4">per month</div>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• Professional London business address</li>
                  <li>• Unlimited digital mail scanning</li>
                  <li>• HMRC & Companies House forwarding (free)</li>
                  <li>• Cancel anytime</li>
                </ul>
                {o?.cadence !== 'monthly' && (
                  <button
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    onClick={() => handlePlanChange('monthly')}
                    disabled={busy !== null}
                  >
                    {busy === 'monthly' ? 'Processing...' : 'Choose Monthly Billing'}
                  </button>
                )}
              </div>

              {/* Annual Plan */}
              <div className={`rounded-lg border p-6 ${o?.cadence === 'yearly' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400' : 'border-border bg-card'}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-foreground">Virtual Mailbox - Annual</h3>
                  {o?.cadence === 'yearly' && <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded font-medium">Current</span>}
                </div>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {o?.cadence === 'yearly' 
                    ? `£${(o?.current_price_pence || (annualPlan?.price_pence || 8999)) / 100}` 
                    : annualPrice ? `£${annualPrice}` : 'Loading...'}
                </div>
                <div className="text-sm text-muted-foreground mb-2">per year</div>
                <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-4">
                  Save 25% (£29.41/year) - Same service, better value
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• Professional London business address</li>
                  <li>• Unlimited digital mail scanning</li>
                  <li>• HMRC & Companies House forwarding (free)</li>
                  <li>• Cancel anytime</li>
                  <li>• <strong>25% savings vs monthly</strong></li>
                </ul>
                {o?.cadence !== 'yearly' && (
                  <button
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    onClick={() => handlePlanChange('yearly')}
                    disabled={busy !== null}
                  >
                    {busy === 'yearly' ? 'Processing...' : 'Choose Annual Billing'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Billing frequency changes take effect immediately. You'll be charged the new rate on your next billing cycle.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <div className="p-6 border-b border-border">
              <div className="text-lg font-semibold text-foreground">Invoices & receipts</div>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 font-medium">Amount</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td className="py-8 text-muted-foreground text-center" colSpan={4}>No invoices yet.</td></tr>
                  ) : items.map((x: any) => (
                    <tr key={x.id} className="border-t border-border">
                      <td className="py-3 text-foreground">{formatDateUK(x.date)}</td>
                      <td className="py-3 text-foreground font-medium">{money(x.amount_pence)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${x.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          x.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {x.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {x.pdf_url ? <a className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium" href={x.pdf_url} target="_blank" rel="noreferrer">Download PDF</a> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer onNavigate={() => { }} />
    </div>
  );
}
