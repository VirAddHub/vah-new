'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const r = useRouter();
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', password:'' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm({ ...form, [k]: v }); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await api.post('/api/auth/signup', form);
    setBusy(false);
    if (!('ok' in res) || !res.ok) { setErr((res as any).error || 'Signup failed'); return; }
    if ((res as any).data?.token) localStorage.setItem('vah_token', (res as any).data.token);
    r.push('/dashboard');
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl mb-6">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="First name" value={form.first_name} onChange={e=>set('first_name', e.target.value)} />
        <Input label="Last name" value={form.last_name} onChange={e=>set('last_name', e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={e=>set('email', e.target.value)} required />
        <Input label="Password" type="password" value={form.password} onChange={e=>set('password', e.target.value)} required />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
      </form>
    </div>
  );
}
