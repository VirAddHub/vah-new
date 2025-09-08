"use client";
import { useEffect, useState } from "react";

type Prefs = { marketing:boolean; product:boolean; security:boolean; unsubscribedAt:number|null; bouncedAt:number|null };

export default function EmailPrefsForm() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/bff/profile/email-prefs", { credentials: "include" })
      .then(r => r.json()).then(j => setPrefs(j.prefs));
  }, []);

  async function toggle(key: keyof Prefs, v: boolean) {
    setSaving(true);
    await fetch("/api/bff/profile/email-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ [key]: v }),
    });
    setPrefs(p => p ? { ...p, [key]: v } as Prefs : p);
    setSaving(false);
  }

  if (!prefs) return <div className="text-sm">Loading…</div>;
  return (
    <div className="space-y-3">
      {(prefs.bouncedAt || prefs.unsubscribedAt) && (
        <div className="text-sm text-amber-700 bg-amber-100 rounded p-2">
          {prefs.bouncedAt && <>We detected a bounce. Non-critical emails are paused.</>}
          {prefs.unsubscribedAt && <> You're unsubscribed on Postmark. Marketing emails are paused.</>}
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={prefs.marketing} onChange={e => toggle("marketing", e.target.checked)} disabled={saving} />
        <span>Marketing updates</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={prefs.product} onChange={e => toggle("product", e.target.checked)} disabled={saving} />
        <span>Product announcements</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={prefs.security} onChange={e => toggle("security", e.target.checked)} disabled={saving} />
        <span>Security & account notices</span>
      </label>
    </div>
  );
}
