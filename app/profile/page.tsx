'use client';
import { useState, useEffect } from 'react';
import { apiGet, apiPostCSRF } from '@/lib/api';

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const kyc = me?.kyc_status || 'unknown';

  useEffect(() => {
    (async () => {
      const data = await apiGet('/api/profile');
      setMe(data);
      setEmail((data as any)?.email || '');
      setPhone((data as any)?.phone || '');
    })();
  }, []);

  async function startReKyc() {
    setBusy(true); setMsg(null);
    try {
      const res = await apiPostCSRF('/api/kyc/start', {});
      const url = (res && ((res as any).url || (res as any)?.data?.url)) || null;
      if (url) window.location.href = url;
      else setMsg('Could not start verification.');
    } catch (e: any) {
      setMsg(e?.message || 'Could not start verification.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await apiPostCSRF('/api/profile', { email, phone });
      setMsg('Profile saved.');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function requestBusinessChange() {
    setBusy(true); setMsg(null);
    try {
      await apiPostCSRF('/api/profile/request-business-name-change', {
        reason: 'User requests business/trading name change',
        details: 'Please verify documentation and update records.',
      });
      setMsg('Request sent. Please complete re-verification to proceed.');
    } catch (e: any) {
      setMsg(e?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {kyc !== 'approved' && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="font-medium mb-1">Verification required</div>
          <p className="text-sm opacity-80 mb-3">
            To continue with certificate/forwarding/name changes, please complete identity verification.
          </p>
          <button onClick={startReKyc} disabled={busy}
            className="px-4 py-2 rounded bg-yellow-500 text-black hover:opacity-90 disabled:opacity-50">
            Reverify now
          </button>
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <label className="block text-sm opacity-80 mb-1">First name (KYC-locked)</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 opacity-60" value={me.first_name || ''} disabled />
        </div>
        <div>
          <label className="block text-sm opacity-80 mb-1">Last name (KYC-locked)</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 opacity-60" value={me.last_name || ''} disabled />
        </div>
        <div>
          <label className="block text-sm opacity-80 mb-1">Business name (KYC-locked)</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 opacity-60" value={me.business_name || ''} disabled />
        </div>
        <div>
          <label className="block text-sm opacity-80 mb-1">Trading name (KYC-locked)</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 opacity-60" value={me.trading_name || ''} disabled />
        </div>

        <div className="h-px bg-white/10 my-2" />

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="text-xs opacity-70 mt-1">We'll send a confirmation to the new email.</p>
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full bg-white/5 border border-white/10 rounded px-3 py-2" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50">Save</button>
          <button onClick={requestBusinessChange} disabled={busy} className="px-4 py-2 rounded border border-white/15 hover:bg-white/10 disabled:opacity-50">Request business/trading name change</button>
        </div>
        {msg && <p className="text-sm opacity-80">{msg}</p>}
      </div>

      <div className="h-px bg-white/10 my-6" />

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Proof of Address / Certificate</h2>
        <p className="opacity-80 text-sm">Download your letter of certification any time.</p>
        <a
          href="/api/profile/certificate-url"
          className={`inline-block px-4 py-2 rounded border ${kyc === 'approved' ? 'border-white/15 hover:bg-white/10' : 'border-white/10 opacity-50 pointer-events-none'
            }`}
        >
          Get certificate PDF
        </a>
      </div>
    </div>
  );
}