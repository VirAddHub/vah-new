'use client';

import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setOk(null); setErr(null);
    try {
      // adjust to your backend route if different
      await api.post('/support', { subject, message });
      setOk('Message sent. We’ll reply shortly.');
      setSubject(''); setMessage('');
    } catch (e: any) {
      setErr(e.message || 'Failed to send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Support</h1>
      {ok && <p className="text-green-700">{ok}</p>}
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded border p-2 min-h-[120px]" required />
        </div>
        <button disabled={busy} className="rounded border px-4 py-2">
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </main>
  );
}