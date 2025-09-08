'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await api.post('/api/auth/login', { email, password });
    setBusy(false);
    if (!('ok' in res) || !res.ok) { setErr((res as any).error || 'Login failed'); return; }
    if ((res as any).data?.token) localStorage.setItem('vah_token', (res as any).data.token);
    r.push('/dashboard');
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="mt-4 text-sm opacity-80"><a className="underline" href="/(auth)/reset">Forgot password?</a></p>
    </div>
  );
}
