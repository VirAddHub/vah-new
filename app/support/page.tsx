'use client';

import { useState, FormEvent } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [inquiryType, setInquiryType] = useState('general');
  const [website, setWebsite] = useState(''); // honeypot
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setOk(null); setErr(null);

    // Honeypot check
    if (website) {
      setErr('Spam detected');
      setBusy(false);
      return;
    }

    try {
      const payload = {
        name,
        email,
        subject,
        message,
        company,
        inquiryType,
        website: '' // honeypot must stay empty
      };

      const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setOk('Thanks! We received your message.');
        setName(''); setEmail(''); setSubject(''); setMessage(''); setCompany('');
      } else {
        setErr(data?.error ?? 'Unable to send message. Please try again.');
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Contact Us</h1>
      {ok && <p className="text-green-700">{ok}</p>}
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Inquiry Type</label>
          <select value={inquiryType} onChange={(e) => setInquiryType(e.target.value)} className="w-full rounded border p-2">
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="sales">Sales</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Subject *</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border p-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Message *</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded border p-2 min-h-[120px]" required />
        </div>
        {/* Honeypot field - hidden from users */}
        <div style={{ display: 'none' }}>
          <label>Website</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <button disabled={busy} className="rounded border px-4 py-2">
          {busy ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </main>
  );
}