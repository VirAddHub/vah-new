'use client';

/**
 * Suspend, restore or close a customer account, with a required reason, a plain statement of the
 * consequences, a confirmation step and the account's standing history (audit trail).
 * Uses POST /api/admin/users/:id/{suspend|restore-standing|close} and GET .../standing.
 * Billing is never changed by these actions; the result shows the real Stripe status.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Standing = 'good' | 'suspended' | 'closed';
type Action = 'suspend' | 'restore' | 'close';

interface HistoryRow {
  id: number;
  action: string;
  created_at: string;
  admin_email: string | null;
  details: { reason?: string; from?: string; to?: string } | string | null;
}
interface StandingData {
  standing: Standing;
  reason: string | null;
  changed_at_ms: number | null;
  access: { level: string; missing: string[]; payment: { state: string }; verification: { state: string } } | null;
  history: HistoryRow[];
}
interface ActionResult {
  standing: Standing | null;
  access_level: string | null;
  stripe: { status: 'action_required' | 'unchanged' | 'none'; message: string };
}

const STANDING_LABEL: Record<Standing, string> = { good: 'Active', suspended: 'Suspended', closed: 'Closed' };

const ACTIONS: Record<Action, { label: string; path: string; allowedFrom: Standing[]; consequences: string[]; confirm: string }> = {
  suspend: {
    label: 'Suspend account',
    path: 'suspend',
    allowedFrom: ['good'],
    consequences: [
      'The customer is signed out everywhere straight away and cannot sign in.',
      'Mail, scans, downloads, forwarding and the certificate are blocked. Incoming mail is still received and held.',
      'Billing is not changed: a live Stripe subscription keeps charging until you cancel it in Stripe.',
      'You can restore the account later.',
    ],
    confirm: 'I understand the customer will lose access immediately.',
  },
  restore: {
    label: 'Restore account',
    path: 'restore-standing',
    allowedFrom: ['suspended', 'closed'],
    consequences: [
      'The customer can sign in again.',
      'Service only returns if their payment and identity checks are also in order; otherwise they are taken to the outstanding step.',
      'Billing is not changed.',
    ],
    confirm: 'I have checked that this account should be restored.',
  },
  close: {
    label: 'Close account',
    path: 'close',
    allowedFrom: ['good', 'suspended'],
    consequences: [
      'The customer is signed out everywhere and cannot sign in. They are told the account is closed.',
      'All service stops. Records, invoices and held mail are kept; nothing is deleted or returned automatically.',
      'Billing is not changed: nothing is cancelled or refunded in Stripe by this action.',
      'An administrator can restore a closed account.',
    ],
    confirm: 'I understand this closes the customer’s account.',
  },
};

function fmt(ts: string | number | null) {
  if (ts == null) return '';
  const d = new Date(typeof ts === 'number' ? ts : ts);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AccountStandingDialog({
  user,
  onClose,
  onChanged,
}: {
  user: { id: string | number; email: string } | null;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [data, setData] = useState<StandingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function load(id: string | number) {
    setLoadError(null);
    try {
      const res = await fetch(`/api/bff/admin/users/${id}/standing`, { credentials: 'include', cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json.data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load account standing');
    }
  }

  useEffect(() => {
    setData(null); setAction(null); setReason(''); setConfirmed(false); setError(null); setResult(null);
    if (user) void load(user.id);
  }, [user]);

  async function submit() {
    if (!user || !action) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bff/admin/users/${user.id}/${ACTIONS[action].path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      setResult(json.data);
      setAction(null); setReason(''); setConfirmed(false);
      await load(user.id);
      await onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action failed');
    } finally {
      setBusy(false);
    }
  }

  const reasonOk = reason.trim().length >= 5;
  const available = data ? (Object.keys(ACTIONS) as Action[]).filter(a => ACTIONS[a].allowedFrom.includes(data.standing)) : [];

  return (
    <Dialog open={!!user} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account standing</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>

        {loadError && <p role="alert" className="text-body-sm text-destructive">Could not load: {loadError}</p>}
        {!data && !loadError && <p className="text-body-sm text-muted-foreground">Loading…</p>}

        {data && (
          <div className="space-y-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
              <dt className="text-muted-foreground">Standing</dt>
              <dd className="font-medium" data-testid="standing">{STANDING_LABEL[data.standing]}</dd>
              {data.reason && (<><dt className="text-muted-foreground">Last reason</dt><dd>{data.reason}</dd></>)}
              {data.changed_at_ms && (<><dt className="text-muted-foreground">Changed</dt><dd>{fmt(data.changed_at_ms)}</dd></>)}
              {data.access && (<>
                <dt className="text-muted-foreground">Service</dt>
                <dd>{data.access.level === 'full' ? 'Full service' : `Restricted (${data.access.missing.join(', ').replace(/_/g, ' ') || 'none'})`}</dd>
                <dt className="text-muted-foreground">Payment</dt><dd>{data.access.payment.state.replace(/_/g, ' ')}</dd>
                <dt className="text-muted-foreground">Identity</dt><dd>{data.access.verification.state.replace(/_/g, ' ')}</dd>
              </>)}
            </dl>

            {result && (
              <div role="status" className="rounded-xl border border-border bg-muted/40 p-4 text-body-sm">
                <p className="font-medium">Done. Account is now {result.standing ? STANDING_LABEL[result.standing].toLowerCase() : 'updated'}.</p>
                <p className="mt-1">
                  <span className="font-medium">Stripe: </span>
                  {result.stripe.status === 'action_required'
                    ? <span>Not cancelled. {result.stripe.message}</span>
                    : <span>{result.stripe.message}</span>}
                </p>
              </div>
            )}

            {!action && available.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {available.map(a => (
                  <Button key={a} variant={a === 'restore' ? 'secondary' : a === 'close' ? 'destructive' : 'outline'} onClick={() => { setAction(a); setResult(null); setError(null); }}>
                    {ACTIONS[a].label}
                  </Button>
                ))}
              </div>
            )}

            {action && (
              <form className="space-y-4 rounded-xl border border-border p-4" onSubmit={e => { e.preventDefault(); if (reasonOk && confirmed) void submit(); }}>
                <p className="font-medium">{ACTIONS[action].label}</p>
                <ul className="list-disc space-y-1 pl-5 text-body-sm text-muted-foreground">
                  {ACTIONS[action].consequences.map(c => <li key={c}>{c}</li>)}
                </ul>
                <div>
                  <label htmlFor="standing-reason" className="block text-body-sm font-medium">Reason (required, kept in the audit trail)</label>
                  <textarea
                    id="standing-reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    required
                    aria-invalid={reason.length > 0 && !reasonOk}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-body-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
                  />
                  {reason.length > 0 && !reasonOk && <p className="mt-1 text-caption text-destructive">At least 5 characters.</p>}
                </div>
                <label className="flex items-start gap-2 text-body-sm">
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
                  <span>{ACTIONS[action].confirm}</span>
                </label>
                {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" variant={action === 'close' ? 'destructive' : 'secondary'} disabled={!reasonOk || !confirmed || busy}>
                    {busy ? 'Working…' : `Confirm: ${ACTIONS[action].label.toLowerCase()}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setAction(null); setError(null); }} disabled={busy}>Cancel</Button>
                </div>
              </form>
            )}

            <div>
              <p className="text-body-sm font-medium">History</p>
              {data.history.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">No standing changes recorded.</p>
              ) : (
                <ol className="mt-2 divide-y divide-border text-body-sm" data-testid="standing-history">
                  {data.history.map(h => {
                    const d = typeof h.details === 'object' && h.details ? h.details : null;
                    return (
                      <li key={h.id} className="py-2">
                        <p><span className="font-medium">{h.action.replace('account_', '').replace(/^\w/, c => c.toUpperCase())}</span> · {fmt(h.created_at)} · {h.admin_email ?? 'unknown admin'}</p>
                        {d?.reason && <p className="text-muted-foreground">{d.reason}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
