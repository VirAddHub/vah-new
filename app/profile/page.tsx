'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';

type Profile = {
  name?: string;
  email?: string;
  forwarding_address?: string;
};

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile>('/profile')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setOk(null);
    setErr(null);
    try {
      await api.put('/profile', {
        name: data.name,
        forwarding_address: data.forwarding_address,
      });
      setOk('Saved.');
    } catch (e: any) {
      setErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (err) return <main className="p-6 text-red-600">{err}</main>;
  if (!data) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {ok && <p className="text-green-700">{ok}</p>}
      <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm mb-1">Email (read-only)</label>
          <input value={data.email ?? ''} disabled className="w-full rounded border p-2 bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            value={data.name ?? ''}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Forwarding address</label>
          <textarea
            value={data.forwarding_address ?? ''}
            onChange={(e) => setData({ ...data, forwarding_address: e.target.value })}
            className="w-full rounded border p-2 min-h-[120px]"
          />
        </div>
        <button disabled={saving} className="rounded border px-4 py-2">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}
