"use client";

/**
 * Admin customer panel › identity results for the account holder and business owners.
 * No identity provider is connected: an administrator records a result they established by
 * reviewing documents, with a reference and notes. Records are permanent and audited.
 */
import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

const getJson = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then(r => r.json());
const input = "h-8 w-full rounded-md border border-line bg-paper px-2.5 text-[13px] text-ink placeholder:text-graphite focus:outline-none focus:ring-2 focus:ring-ink/20";
const human = (s: unknown) => String(s ?? "—").replace(/_/g, " ");

export function IdentityResults({ userId }: { userId: string | number }) {
  const url = `/api/admin/users/${userId}/identity`;
  const { data, mutate } = useSWR(url, getJson);
  const d = data?.data;
  const [who, setWho] = useState<string | null>(null);
  const [form, setForm] = useState({ outcome: "verified", reference: "", notes: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!d) return null;

  const people = [{ key: "account_holder", name: `${d.account_holder.name || "Account holder"} (account holder)`, status: d.account_holder.status },
    ...d.owners.map((o: any) => ({ key: `owner:${o.id}`, name: `${o.full_name} (${o.role === "psc" ? "owner" : "director"})`, status: o.status, ownerId: o.id }))];

  const save = async () => {
    const p = people.find(x => x.key === who)!;
    setMsg(null);
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: p.key === "account_holder" ? "account_holder" : "owner", ownerId: (p as any).ownerId, ...form }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setMsg({ ok: false, text: j?.message || "Not recorded." }); return; }
    setMsg({ ok: true, text: "Recorded." }); setWho(null); setForm({ outcome: "verified", reference: "", notes: "" }); await mutate();
  };

  return (
    <div className="mt-6 rounded-md border border-line">
      <p className="border-b border-line px-3 py-2 text-[13px] font-semibold text-ink">Identity <span className="font-normal text-graphite">· no provider connected; results recorded here</span></p>
      <ul className="divide-y divide-line">
        {people.map(p => (
          <li key={p.key} className="px-3 py-2 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span>{p.name}</span>
              <span className="flex items-center gap-2"><span className={cn(["approved", "verified"].includes(p.status) ? "text-primary" : "text-graphite")}>{human(p.status)}</span>
                {who !== p.key && <button type="button" className="text-[12px] underline" onClick={() => { setWho(p.key); setMsg(null); }}>Record result…</button>}</span>
            </div>
            {who === p.key && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-3 text-[13px]">
                  <label className="flex items-center gap-1"><input type="radio" checked={form.outcome === "verified"} onChange={() => setForm({ ...form, outcome: "verified" })} /> Verified</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={form.outcome === "rejected"} onChange={() => setForm({ ...form, outcome: "rejected" })} /> Not verified</label>
                </div>
                <input className={input} placeholder="Reference (where the documents are kept)" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} aria-label="Reference" />
                <input className={input} placeholder="Documents checked and how (for example, passport checked against live video call)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} aria-label="Notes" />
                <div className="flex gap-2">
                  <button type="button" className="h-8 rounded-md bg-ink px-3 text-[13px] font-medium text-paper disabled:opacity-50" disabled={!form.reference.trim() || form.notes.trim().length < 10} onClick={save}>Record</button>
                  <button type="button" className="h-8 rounded-md px-3 text-[13px] text-graphite" onClick={() => setWho(null)}>Cancel</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("px-3 pb-2 text-[13px]", msg.ok ? "text-primary" : "text-destructive")}>{msg.text}</p>}
      {d.records.length > 0 && (
        <details className="border-t border-line px-3 py-2 text-[12px] text-graphite"><summary className="cursor-pointer">{d.records.length} recorded result(s)</summary>
          <ul className="mt-1 space-y-0.5">{d.records.map((r: any) => <li key={r.id}>{new Date(r.created_at).toLocaleDateString("en-GB")} · {human(r.subject)}{r.owner_id ? ` #${r.owner_id}` : ""} · {r.outcome} · {human(r.method)}{r.reference ? ` · ${r.reference}` : ""}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
