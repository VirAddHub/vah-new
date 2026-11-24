'use client';

/**
 * Grant or remove admin access for one account, from the user side panel.
 *
 * The server enforces the rules: only a current admin can change this, nobody can change their own
 * admin access, the change is written to the admin audit log, and the account is signed out
 * everywhere so an old session can't keep the old level of access.
 */
import useSWR from 'swr';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const whoami = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then(r => r.json()).catch(() => null);

export function AdminAccessControl({ userId, email, isAdmin, onChanged }: {
  userId: string | number;
  email: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const me = useSWR('/api/bff/auth/whoami', whoami);
  const myId = me.data?.data?.user?.id ?? me.data?.data?.id ?? me.data?.user?.id;
  const isSelf = myId != null && String(myId) === String(userId);

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const next = !isAdmin;

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: next }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || j?.ok === false) {
        throw new Error(j?.message || (j?.error === 'forbidden' ? 'Only an admin can change this.' : 'Could not change admin access. Please try again.'));
      }
      setDone(next ? `${email} is now an admin.` : `${email} is no longer an admin.`);
      setConfirming(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change admin access.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="admin-access-heading" className="mt-6 rounded-lg border border-line p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-graphite" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 id="admin-access-heading" className="text-[15px] font-semibold text-ink">Admin access</h3>
          <p className="mt-1 text-[13px] text-graphite">
            {isAdmin ? 'This account can use the admin area.' : 'This account is a customer account.'}
          </p>

          {isSelf ? (
            <p className="mt-3 text-[13px] text-graphite">You can't change your own admin access. Ask another admin.</p>
          ) : confirming ? (
            <div className="mt-3 rounded-md bg-mist p-3" role="alertdialog" aria-labelledby="admin-access-confirm">
              <p id="admin-access-confirm" className="text-[13px] text-ink">
                {next
                  ? <>Give <strong>{email}</strong> full admin access? They will be able to see and change every customer's account, mail and billing.</>
                  : <>Remove admin access from <strong>{email}</strong>? They will be signed out and keep only their own customer account.</>}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={next ? 'primary' : 'destructive'} onClick={apply} disabled={busy}>
                  {busy ? 'Saving…' : next ? 'Yes, make admin' : 'Yes, remove admin'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => { setDone(null); setError(null); setConfirming(true); }}>
              {isAdmin ? 'Remove admin access' : 'Make admin'}
            </Button>
          )}

          {done && <p className="mt-3 text-[13px] text-success" role="status">{done} They have been signed out everywhere so the change applies straight away.</p>}
          {error && <p className="mt-3 text-[13px] text-destructive" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
