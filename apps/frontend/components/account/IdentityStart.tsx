'use client';

/**
 * Start identity verification. Provider-independent: while no identity provider is connected the
 * API answers "not available" and the customer is told we will contact them. (In test environments
 * an auto-approve switch may approve straight away.)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/hooks/useAccess';

export function IdentityStart() {
  const { refresh: mutate } = useAccess();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const start = async () => {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch('/api/bff/kyc/start', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.auto_approved) {
        setMessage({ ok: true, text: 'Your identity has been verified.' });
        await mutate();
      } else if (res.status === 503) {
        setMessage({ ok: false, text: json?.message || 'Online identity verification is not available yet. We will contact you to complete it.' });
      } else {
        setMessage({ ok: false, text: json?.message || 'We could not start identity verification. Please try again later.' });
      }
    } catch {
      setMessage({ ok: false, text: 'We could not start identity verification. Please try again later.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button type="button" onClick={start} disabled={busy} className="h-11">{busy ? 'Starting…' : 'Start identity verification'}</Button>
      {message && <p role={message.ok ? 'status' : 'alert'} className="text-body-sm text-muted-foreground">{message.text}</p>}
    </div>
  );
}
