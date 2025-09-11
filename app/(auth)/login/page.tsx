'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPostCSRF } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const r = useRouter();
  const search = useSearchParams();
  const nextParam = search?.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<any>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPostCSRF('/api/auth/login', { email, password });
      const profile = await apiGet('/api/profile');
      setMe(profile);
      setErr('Logged in ✅');

      // Honor ?next= if provided and user is not adminish or next points to admin-allowed page
      const adminish = profile && typeof profile === 'object' && 'role' in profile && ['staff', 'admin', 'owner'].includes((profile as any).role);
      const want = decodeURIComponent(nextParam);
      const isAdminNext = want.startsWith('/admin');

      if (isAdminNext && !adminish) {
        setTimeout(() => r.push('/dashboard'), 1000);
      } else if (!want || want === '/') {
        setTimeout(() => r.push(adminish ? '/admin' : '/dashboard'), 1000);
      } else {
        setTimeout(() => r.push(want), 1000);
      }
    } catch (error: any) {
      setErr(`Login failed ❌ ${error?.message ?? ''}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {err && <p className={`text-sm ${err.includes('✅') ? 'text-green-600' : 'text-red-400'}`}>{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      {me && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Profile Data:</h3>
          <pre className="text-xs bg-gray-50 border p-3 rounded overflow-auto">
            {JSON.stringify(me, null, 2)}
          </pre>
        </div>
      )}

      <p className="mt-4 text-sm opacity-80"><a className="underline" href="/(auth)/reset">Forgot password?</a></p>
    </div>
  );
}
