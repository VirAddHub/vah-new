'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPostCSRF } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const r = useRouter();
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
      // Redirect after successful login
      setTimeout(() => r.push('/dashboard'), 1000);
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
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
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
