'use client';

/**
 * Side panel for one customer: Profile, Mail, Billing and Audit tabs, read from existing admin
 * endpoints. Opened by clicking a row in the Users table. Actions that change the account stay in
 * the Account standing dialog, which this panel can open.
 */
import * as Dialog from '@radix-ui/react-dialog';
import useSWR from 'swr';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'mail' | 'billing' | 'audit';
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'mail', label: 'Mail' },
  { id: 'billing', label: 'Billing' },
  { id: 'audit', label: 'Audit' },
];

const getJson = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then(async r => {
    const j = await r.json().catch(() => null);
    if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  });

function fmtDate(v: unknown) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  const d = Number.isFinite(n) && String(v).length >= 12 ? new Date(n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
const money = (pence: unknown) => (pence == null ? '—' : `£${(Number(pence) / 100).toFixed(2)}`);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-graphite">{label}</dt>
      <dd className="min-w-0 break-words text-right text-ink">{children}</dd>
    </div>
  );
}

function State({ loading, error, empty, children }: { loading: boolean; error?: unknown; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <p className="py-8 text-[14px] text-graphite" role="status">Loading…</p>;
  if (error) return <p className="py-8 text-[14px] text-destructive" role="alert">Could not load this: {(error as Error).message}</p>;
  if (empty) return <p className="py-8 text-[14px] text-graphite">Nothing recorded yet.</p>;
  return <>{children}</>;
}

export function AdminUserPanel({ user, onClose, onOpenStanding }: {
  user: { id: string | number; email: string; service_label?: string | null } | null;
  onClose: () => void;
  onOpenStanding: (u: { id: string | number; email: string }) => void;
}) {
  const [tab, setTab] = useState<Tab>('profile');
  const id = user?.id;
  const profile = useSWR(id && tab === 'profile' ? `/api/admin/users/${id}` : null, getJson);
  const standing = useSWR(id && (tab === 'profile' || tab === 'audit') ? `/api/bff/admin/users/${id}/standing` : null, getJson);
  const mail = useSWR(id && tab === 'mail' ? `/api/admin/mail-items?user_id=${id}&limit=50` : null, getJson);
  const billing = useSWR(id && tab === 'billing' ? `/api/bff/admin/invoices?user_id=${id}&pageSize=50` : null, getJson);

  const p = profile.data?.data;
  const s = standing.data?.data;
  const mailItems: any[] = mail.data?.items ?? mail.data?.data ?? [];
  const invoices: any[] = billing.data?.data?.items ?? [];

  return (
    <Dialog.Root open={!!user} onOpenChange={o => { if (!o) { onClose(); setTab('profile'); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-line bg-paper shadow-lg focus:outline-none"
          aria-describedby={undefined}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">{user?.email}</Dialog.Title>
              {/* div, not p: Badge renders a div, which is not allowed inside a paragraph. */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-graphite">
                <span className="figure-mono">User #{user?.id}</span>
                {user?.service_label && <Badge variant="secondary">{user.service_label}</Badge>}
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-graphite hover:bg-mist hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </header>

          <div role="tablist" aria-label="Customer details" className="flex gap-1 overflow-x-auto border-b border-line px-4">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn('-mb-px h-11 shrink-0 border-b-2 px-3 text-[14px]', tab === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-graphite hover:text-ink')}>
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-[14px]">
            {tab === 'profile' && (
              <State loading={profile.isLoading} error={profile.error}>
                <dl className="divide-y divide-line">
                  <Row label="Name">{[p?.first_name, p?.last_name].filter(Boolean).join(' ') || '—'}</Row>
                  <Row label="Company">{p?.company_name || '—'}</Row>
                  <Row label="Phone">{p?.phone || '—'}</Row>
                  <Row label="Joined"><span className="figure-mono">{fmtDate(p?.created_at)}</span></Row>
                  <Row label="Last sign-in"><span className="figure-mono">{fmtDate(p?.last_login_at)}</span></Row>
                  <Row label="Identity">{s?.access?.verification?.state?.replace(/_/g, ' ') ?? p?.kyc_status ?? '—'}</Row>
                  <Row label="Payment">{s?.access?.payment?.state?.replace(/_/g, ' ') ?? '—'}</Row>
                  <Row label="Standing">{s?.standing === 'good' ? 'Active' : s?.standing ?? '—'}</Row>
                </dl>
                {user && (
                  <Button variant="outline" className="mt-6" onClick={() => onOpenStanding({ id: user.id, email: user.email })}>
                    Suspend, restore or close…
                  </Button>
                )}
              </State>
            )}

            {tab === 'mail' && (
              <State loading={mail.isLoading} error={mail.error} empty={!mailItems.length}>
                <ul className="divide-y divide-line">
                  {mailItems.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-4 py-2.5">
                      <span className="min-w-0 truncate text-ink">{m.subject || m.sender_name || `Item #${m.id}`}</span>
                      <span className="figure-mono shrink-0 text-[13px] text-graphite">{fmtDate(m.received_at_ms ?? m.received_date ?? m.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </State>
            )}

            {tab === 'billing' && (
              <State loading={billing.isLoading} error={billing.error} empty={!invoices.length}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left">
                    <caption className="sr-only">Invoices</caption>
                    <thead className="border-b border-line text-[12px] uppercase tracking-[0.06em] text-slate">
                      <tr><th className="py-2 font-medium">Invoice</th><th className="py-2 font-medium">Status</th><th className="py-2 text-right font-medium">Amount</th><th className="py-2 text-right font-medium">Date</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="figure-mono py-2.5">{inv.invoice_number || inv.number || `#${inv.id}`}</td>
                          <td className="py-2.5">{inv.status}</td>
                          <td className="figure-mono py-2.5 text-right">{money(inv.amount_pence)}</td>
                          <td className="figure-mono py-2.5 text-right">{fmtDate(inv.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </State>
            )}

            {tab === 'audit' && (
              <State loading={standing.isLoading} error={standing.error} empty={!s?.history?.length}>
                <ol className="divide-y divide-line">
                  {(s?.history ?? []).map((h: any) => (
                    <li key={h.id} className="py-2.5">
                      <p className="text-ink">
                        <span className="font-medium">{String(h.action).replace('account_', '').replace(/^\w/, (c: string) => c.toUpperCase())}</span>
                        <span className="text-graphite"> · {fmtDate(h.created_at)} · {h.admin_email ?? 'unknown admin'}</span>
                      </p>
                      {h.details?.reason && <p className="text-graphite">{h.details.reason}</p>}
                    </li>
                  ))}
                </ol>
              </State>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
