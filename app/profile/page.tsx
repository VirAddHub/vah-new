'use client'
import { useEffect, useState } from 'react'

type Profile = {
  id: number; email: string; phone: string | null;
  first_name: string; last_name: string;
  business_name: string; trading_name: string;
  kyc_status: 'pending' | 'approved' | 'reverify_required' | 'rejected' | string;
}

export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/bff/profile').then(r => r.json()).then(d => {
      setP(d.profile); setEmail(d.profile.email); setPhone(d.profile.phone || '')
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/bff/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, phone }) })
    setSaving(false)
    if (!r.ok) alert('Save failed')
    else alert('Saved')
  }

  if (!p) return <div className="p-6">Loading…</div>
  const locked = true // KYC-locked for names

  return (
    <div className="max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {p.kyc_status !== 'approved' && (
        <div className="p-3 rounded bg-yellow-100 text-yellow-900">
          KYC not approved. Certain fields are locked and some actions are disabled.
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input className="w-full border rounded p-2" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Phone</label>
        <input className="w-full border rounded p-2" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">First name</label>
          <input className="w-full border rounded p-2 bg-gray-50" value={p.first_name || ''} disabled={locked} />
        </div>
        <div>
          <label className="block text-sm">Last name</label>
          <input className="w-full border rounded p-2 bg-gray-50" value={p.last_name || ''} disabled={locked} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm">Business name</label>
          <input className="w-full border rounded p-2 bg-gray-50" value={p.business_name || ''} disabled={locked} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm">Trading name</label>
          <input className="w-full border rounded p-2 bg-gray-50" value={p.trading_name || ''} disabled={locked} />
        </div>
      </div>

      <button className="px-4 py-2 rounded bg-black text-white" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}