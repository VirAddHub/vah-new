"use client";

/**
 * Staff enter a customer's company details for them (from a call, email, meeting or documents),
 * instead of waiting for the customer to fill in the form. Starts from the latest details, or from
 * the Companies House register (directors and PSCs). Recorded as entered by this administrator,
 * with how the customer gave the details.
 */
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Person = {
  full_name: string; email: string; is_account_holder: boolean; is_director: boolean; is_beneficial_owner: boolean;
  ownership_percent: string; voting_percent: string; other_control: boolean; country_of_residence: string; register_note?: string;
};
const blank = (): Person => ({ full_name: "", email: "", is_account_holder: false, is_director: false, is_beneficial_owner: false,
  ownership_percent: "", voting_percent: "", other_control: false, country_of_residence: "United Kingdom" });
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const inputCls = "h-8 w-full rounded-md border border-line bg-paper px-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/20";
const ROLES = [["director_and_beneficial_owner", "Director and owner"], ["director", "Director"], ["beneficial_owner", "Owner"], ["authorised_person", "Someone else authorised by the company"]] as const;

export function StaffDeclarationForm({ api, onClose, onSaved }: { api: string; onClose: () => void; onSaved: (text: string) => Promise<void> }) {
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>("");
  const [sources, setSources] = useState<Record<string, string>>({});
  const [f, setF] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [source, setSource] = useState("phone");
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${api}/declaration/prefill`, { credentials: "include", cache: "no-store" }).then(r => r.json()).then(j => {
      if (!live) return;
      if (!j?.ok) { setErr(j?.message || "Could not load the details."); setLoading(false); return; }
      const d = j.data.data;
      setFrom(j.data.from); setSources(j.data.sources ?? {});
      setF({ nature_of_business: d.nature_of_business ?? "", trading_name: d.trading_name ?? "", website: d.website ?? "",
        same: d.principal_place_of_business?.same_as_registered_office ?? true, address: d.principal_place_of_business?.address ?? "",
        applicant_role: d.applicant_role ?? "director", applicant_authority: d.applicant_authority ?? "",
        no_owner: d.no_beneficial_owner_explanation ?? "", expected_monthly_mail: d.expected_monthly_mail ?? "0-10", corporate_owners: d.corporate_owners ?? [] });
      setPeople((d.people ?? []).map((p: any) => ({ ...blank(), ...p, email: p.email ?? "",
        ownership_percent: p.ownership_percent == null ? "" : String(p.ownership_percent), voting_percent: p.voting_percent == null ? "" : String(p.voting_percent) })));
      setLoading(false);
    }).catch(e => { if (live) { setErr(String(e?.message || e)); setLoading(false); } });
    return () => { live = false; };
  }, [api]);

  const setP = (i: number, patch: Partial<Person>) => setPeople(ps => ps.map((p, j) => (j === i ? { ...p, ...patch } : patch.is_account_holder ? { ...p, is_account_holder: false } : p)));

  const save = async () => {
    setErr("");
    if (note.trim().length < 5) { setErr("Add a short note on how the customer gave you these details (who, when, which email or document)."); return; }
    setBusy(true);
    try {
      const data = {
        nature_of_business: f.nature_of_business, trading_name: f.trading_name || null, website: f.website || null,
        principal_place_of_business: { same_as_registered_office: f.same, address: f.same ? null : f.address },
        applicant_role: f.applicant_role, applicant_authority: f.applicant_role === "authorised_person" ? f.applicant_authority : null,
        people: people.map(p => ({ full_name: p.full_name, email: p.email.trim() || null, is_account_holder: p.is_account_holder, is_director: p.is_director,
          is_beneficial_owner: p.is_beneficial_owner, ownership_percent: num(p.ownership_percent), voting_percent: num(p.voting_percent),
          other_control: p.other_control, country_of_residence: p.country_of_residence })),
        corporate_owners: f.corporate_owners, no_beneficial_owner_explanation: f.no_owner || null, expected_monthly_mail: f.expected_monthly_mail,
      };
      const r = await fetch(`${api}/declaration`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ data, source, source_note: note.trim(), invite }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        const issues: { path: string; message: string }[] = j?.issues ?? [];
        const named = issues.map(i => { const m = i.path.match(/^people\.(\d+)/); const who = m ? people[Number(m[1])]?.full_name : ""; return who ? `${who}: ${i.message}` : i.message; });
        setErr(named.length ? named.join(". ") : j?.message || `Could not save (${r.status}).`);
        return;
      }
      const inv: string[] = j.data?.invited ?? [];
      await onSaved(`Details saved${inv.length ? ` and ${inv.join(", ")} emailed to verify their identity` : ""}. The comparison with Companies House has run.`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Enter the company details">
      <div className="my-6 w-full max-w-3xl rounded-xl border border-line bg-white p-5 text-[13px] text-ink shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold">Enter the company details</h3>
            <p className="text-graphite">
              {from === "register" ? "Started from the Companies House register. Check each person and add the ownership figures the customer gave you."
                : from === "returned" ? "Started from the details you sent back. Correct them with what the customer told you."
                : "Started from the customer's latest details. Change what they told you is different."}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-graphite hover:bg-mist"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        {loading ? <p role="status" className="py-6 text-graphite">Loading…</p> : !f ? <p role="alert" className="text-destructive">{err}</p> : (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
            <fieldset className="grid gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-[200px_1fr]">
              <legend className="px-1 font-medium">How did the customer give you these details?</legend>
              <select aria-label="Source" className={inputCls} value={source} onChange={e => setSource(e.target.value)}>
                {Object.entries(sources).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input aria-label="Source note" className={inputCls} placeholder="Who, when, and which email or document. For example: call with Jane Smith, 27 Nov, 3pm" value={note} onChange={e => setNote(e.target.value)} />
            </fieldset>

            <label className="block font-medium">What the business does
              <textarea className={cn(inputCls, "mt-1 h-16 py-1.5 font-normal")} value={f.nature_of_business} onChange={e => setF({ ...f, nature_of_business: e.target.value })} />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block font-medium">Trading name<input className={cn(inputCls, "mt-1 font-normal")} value={f.trading_name} onChange={e => setF({ ...f, trading_name: e.target.value })} /></label>
              <label className="block font-medium">Website<input className={cn(inputCls, "mt-1 font-normal")} value={f.website} onChange={e => setF({ ...f, website: e.target.value })} /></label>
              <label className="block font-medium">Letters a month
                <select className={cn(inputCls, "mt-1 font-normal")} value={f.expected_monthly_mail} onChange={e => setF({ ...f, expected_monthly_mail: e.target.value })}>
                  {["0-10", "11-50", "51-200", "200+"].map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block font-medium">The account holder is
                <select className={cn(inputCls, "mt-1 font-normal")} value={f.applicant_role} onChange={e => setF({ ...f, applicant_role: e.target.value })}>
                  {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              {f.applicant_role === "authorised_person" && <label className="block font-medium">Their authority<input className={cn(inputCls, "mt-1 font-normal")} placeholder="For example: company secretary, board resolution of 1 Nov" value={f.applicant_authority} onChange={e => setF({ ...f, applicant_authority: e.target.value })} /></label>}
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.same} onChange={e => setF({ ...f, same: e.target.checked })} /> They trade from the registered office</label>
            {!f.same && <input aria-label="Place of business" className={inputCls} placeholder="Where they actually trade from" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />}

            <div>
              <p className="mb-1 font-medium">Directors and owners</p>
              <ul className="space-y-2">
                {people.map((p, i) => {
                  const who = p.full_name || `Person ${i + 1}`;
                  return (
                    <li key={i} className="rounded-md border border-line p-2.5">
                      <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_auto]">
                        <label className="block text-[12px] text-graphite">Name<input aria-label={`Person ${i + 1} name`} className={cn(inputCls, "mt-0.5")} value={p.full_name} onChange={e => setP(i, { full_name: e.target.value })} /></label>
                        <label className="block text-[12px] text-graphite">Email (optional)<input aria-label={`Person ${i + 1} email`} className={cn(inputCls, "mt-0.5")} value={p.email} onChange={e => setP(i, { email: e.target.value })} /></label>
                        <label className="block text-[12px] text-graphite">Lives in<input aria-label={`${who} country`} className={cn(inputCls, "mt-0.5")} value={p.country_of_residence} onChange={e => setP(i, { country_of_residence: e.target.value })} /></label>
                        <button type="button" aria-label={`Remove ${who}`} className="self-end rounded p-1.5 text-graphite hover:bg-mist" onClick={() => setPeople(ps => ps.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden /></button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <label className="flex items-center gap-1.5"><input aria-label={`${who} is a director`} type="checkbox" checked={p.is_director} onChange={e => setP(i, { is_director: e.target.checked })} /> Director</label>
                        <label className="flex items-center gap-1.5"><input aria-label={`${who} is an owner`} type="checkbox" checked={p.is_beneficial_owner} onChange={e => setP(i, { is_beneficial_owner: e.target.checked })} /> Owner or controller</label>
                        {p.is_beneficial_owner && <>
                          <label className="flex items-center gap-1.5">Shares<input aria-label={`${who} shares`} className={cn(inputCls, "w-16")} inputMode="decimal" value={p.ownership_percent} onChange={e => setP(i, { ownership_percent: e.target.value })} />%</label>
                          <label className="flex items-center gap-1.5">Votes<input aria-label={`${who} votes`} className={cn(inputCls, "w-16")} inputMode="decimal" value={p.voting_percent} onChange={e => setP(i, { voting_percent: e.target.value })} />%</label>
                          <label className="flex items-center gap-1.5"><input aria-label={`${who} has other control`} type="checkbox" checked={p.other_control} onChange={e => setP(i, { other_control: e.target.checked })} /> Other control</label>
                        </>}
                        <label className="ml-auto flex items-center gap-1.5"><input aria-label={`${who} is the account holder`} type="radio" name="holder" checked={p.is_account_holder} onChange={() => setP(i, { is_account_holder: true })} /> Account holder</label>
                      </div>
                      {p.register_note && <p className="mt-1.5 text-[12px] text-graphite">{p.register_note}</p>}
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="mt-1 inline-flex items-center gap-1 text-ink underline" onClick={() => setPeople(ps => [...ps, blank()])}><Plus className="h-4 w-4" aria-hidden /> Add a person</button>
            </div>
            {!people.some(p => p.is_beneficial_owner) && f.corporate_owners.length === 0 && (
              <label className="block font-medium">Why no one owns or controls more than 25%
                <input className={cn(inputCls, "mt-1 font-normal")} value={f.no_owner} onChange={e => setF({ ...f, no_owner: e.target.value })} />
              </label>
            )}
            <label className="flex items-center gap-2"><input type="checkbox" checked={invite} onChange={e => setInvite(e.target.checked)} /> Email the other directors and owners who have an email address to verify their identity</label>

            {err && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-red-800">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="h-8 rounded-md px-3 text-graphite hover:bg-mist" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 font-medium text-paper disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save details</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
