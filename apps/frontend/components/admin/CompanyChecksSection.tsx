"use client";

/**
 * Admin › Company checks. Company due diligence from the Companies House register: link a company to
 * a customer, review the extract against what the customer told us, work through the checklist,
 * record discrepancies, notes and evidence, decide, and keep dated reports. One screen: list + detail.
 *
 * Individual identity, address, PEP, sanctions and adverse-media checks are not done here.
 */
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Bell, Building2, Check, Download, Loader2, Plus, RefreshCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api/admin/company-checks";
const getJson = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.message || j?.error || `Request failed (${r.status})`);
  return j;
};
async function send(url: string, body: unknown = {}) {
  const r = await fetch(url, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok || j?.ok === false) throw new Error(j?.message || (j?.error ? String(j.error).replace(/_/g, " ") : `Request failed (${r.status})`));
  return j;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  in_progress: { label: "In progress", cls: "bg-mist text-ink border-line" },
  further_investigation: { label: "Further investigation", cls: "bg-amber-50 text-amber-900 border-amber-200" },
  satisfactory: { label: "Satisfactory", cls: "bg-primary/10 text-primary border-primary/20" },
};
const FILTERS = [
  { id: "alerts", label: "Alerts" },
  { id: "in_progress", label: "In progress" },
  { id: "further_investigation", label: "Investigating" },
  { id: "satisfactory", label: "Satisfactory" },
  { id: "", label: "All" },
] as const;

const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const addr = (a: any) => (a ? [a.premises, a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code, a.country].filter(Boolean).join(", ") : "—");
const human = (s: unknown) => String(s ?? "—").replace(/-/g, " ").replace(/_/g, " ");

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-mist text-ink border-line" };
  return <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[12px] font-medium", s.cls)}>{s.label}</span>;
}
function Btn({ className, variant = "outline", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "solid" | "ghost" }) {
  return (
    <button type="button" {...p}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variant === "solid" && "bg-ink text-paper hover:opacity-90",
        variant === "outline" && "border border-line bg-paper text-ink hover:bg-mist",
        variant === "ghost" && "text-graphite hover:bg-mist hover:text-ink", className)} />
  );
}
const inputCls = "h-8 w-full rounded-md border border-line bg-paper px-2.5 text-[13px] text-ink placeholder:text-graphite focus:outline-none focus:ring-2 focus:ring-ink/20";
function Section({ title, count, children, open }: { title: string; count?: number; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-[13px] font-semibold text-ink">
        <span>{title}{count != null && <span className="ml-1.5 font-normal text-graphite">{count}</span>}</span>
        <span className="text-graphite transition group-open:rotate-90">›</span>
      </summary>
      <div className="pb-3 text-[13px]">{children}</div>
    </details>
  );
}

export default function CompanyChecksSection() {
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const listKey = `${API}?status=${filter}&q=${encodeURIComponent(q)}`;
  const list = useSWR(listKey, getJson, { refreshInterval: 60_000 });
  const items: any[] = list.data?.data?.items ?? [];
  const total = list.data?.data?.checklist_total ?? 11;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink"><Building2 className="h-5 w-5" aria-hidden /> Company checks</h1>
          <p className="text-[13px] text-graphite">Company due diligence from the Companies House register. Individual identity, address, PEP, sanctions and adverse-media checks are recorded separately.</p>
        </div>
        <Btn variant="solid" onClick={() => { setCreating(true); setSelected(null); }}><Plus className="h-4 w-4" aria-hidden /> New check</Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <aside className="rounded-lg border border-line bg-paper">
          <div className="space-y-2 border-b border-line p-2.5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter checks">
              {FILTERS.map(f => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                  className={cn("rounded-full px-2.5 py-1 text-[12px]", filter === f.id ? "bg-ink text-paper" : "text-graphite hover:bg-mist")}>{f.label}</button>
              ))}
            </div>
            <label className="relative block">
              <span className="sr-only">Search checks</span>
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-graphite" aria-hidden />
              <input className={cn(inputCls, "pl-8")} placeholder="Company, number or email" value={q} onChange={e => setQ(e.target.value)} />
            </label>
          </div>
          {list.isLoading ? <p className="p-4 text-[13px] text-graphite">Loading…</p>
            : list.error ? <p className="p-4 text-[13px] text-destructive">{String(list.error.message)}</p>
            : !items.length ? <p className="p-4 text-[13px] text-graphite">No checks{filter ? " in this view" : " yet"}.</p>
            : (
              <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
                {items.map(i => (
                  <li key={i.id}>
                    <button type="button" onClick={() => { setSelected(Number(i.id)); setCreating(false); }} aria-current={selected === Number(i.id)}
                      className={cn("w-full px-3 py-2.5 text-left hover:bg-mist", selected === Number(i.id) && "bg-mist")}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{i.company_name || i.company_number}</span>
                        {i.open_alerts > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-900"><Bell className="h-3 w-3" aria-hidden />{i.open_alerts}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-graphite">
                        <span className="truncate"><span className="figure-mono">{i.company_number}</span> · {i.email}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-graphite">
                        <StatusBadge status={i.status} /> <span>{i.checklist_done}/{total} checked</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
          {creating ? <NewCheck onCreated={id => { setCreating(false); setSelected(id); void list.mutate(); }} onCancel={() => setCreating(false)} />
            : selected ? <CheckDetail id={selected} onChanged={() => void list.mutate()} />
            : <p className="py-10 text-center text-[13px] text-graphite">Select a check, or start a new one.</p>}
        </section>
      </div>
    </div>
  );
}

function NewCheck({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [userQ, setUserQ] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [companyQ, setCompanyQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const users = useSWR(userQ.trim().length >= 2 && !customer ? `/api/bff/admin/users/search?q=${encodeURIComponent(userQ.trim())}` : null, getJson);
  const cust = useSWR(customer ? `${API}/customer/${customer.id}` : null, getJson);
  const [searchTerm, setSearchTerm] = useState("");
  const companies = useSWR(searchTerm ? `${API}/search?q=${encodeURIComponent(searchTerm)}` : null, getJson);
  const supplied = cust.data?.data?.customer;

  const link = async (companyNumber: string) => {
    setBusy(true); setError(null);
    try {
      const r = await send(API, { userId: customer.id, companyNumber });
      if (r.warning) setError(r.warning);
      onCreated(Number(r.data.id));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-ink">New company check</h2><Btn variant="ghost" onClick={onCancel}>Cancel</Btn></div>
      <div>
        <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-graphite">1. Customer</p>
        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-[13px]">
            <span><span className="font-medium text-ink">{customer.email}</span> · #{customer.id}{supplied && <> · supplied: {supplied.company_name || "no company name"} <span className="figure-mono">{supplied.company_number || ""}</span></>}</span>
            <Btn variant="ghost" onClick={() => { setCustomer(null); setSearchTerm(""); }}>Change</Btn>
          </div>
        ) : (
          <>
            <input className={inputCls} placeholder="Search customers by email or name" value={userQ} onChange={e => setUserQ(e.target.value)} aria-label="Search customers" />
            {(users.data?.data ?? []).length > 0 && (
              <ul className="mt-1 divide-y divide-line rounded-md border border-line">
                {(users.data?.data ?? []).slice(0, 8).map((u: any) => (
                  <li key={u.id}><button type="button" className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-mist" onClick={() => setCustomer(u)}>
                    {u.email} <span className="text-graphite">· {[u.first_name, u.last_name].filter(Boolean).join(" ")}{u.company_name ? ` · ${u.company_name}` : ""}</span>
                  </button></li>
                ))}
              </ul>
            )}
          </>
        )}
        {cust.data?.data?.checks?.length > 0 && <p className="mt-1 text-[12px] text-graphite">Existing checks: {cust.data.data.checks.map((c: any) => `${c.company_number} (${STATUS[c.status]?.label ?? c.status})`).join(", ")}</p>}
      </div>

      {customer && (
        <div>
          <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-graphite">2. Company</p>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setSearchTerm((companyQ || supplied?.company_number || "").trim()); }}>
            <input className={inputCls} placeholder={supplied?.company_number ? `Company name or number (customer gave ${supplied.company_number})` : "Company name or number"} value={companyQ} onChange={e => setCompanyQ(e.target.value)} aria-label="Search Companies House" />
            <Btn type="submit">Search</Btn>
          </form>
          {companies.isLoading && <p className="mt-2 text-[13px] text-graphite">Searching Companies House…</p>}
          {companies.error && <p className="mt-2 text-[13px] text-destructive">{String(companies.error.message)}</p>}
          {(companies.data?.data ?? []).length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line">
              {companies.data.data.map((c: any) => (
                <li key={c.company_number} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                  <span className="min-w-0"><span className="font-medium text-ink">{c.title}</span> <span className="figure-mono text-graphite">{c.company_number}</span>
                    <span className="block truncate text-[12px] text-graphite">{human(c.company_status)} · {c.address_snippet}</span></span>
                  <Btn variant="solid" disabled={busy} onClick={() => link(c.company_number)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Link and retrieve"}</Btn>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-[13px] text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function CheckDetail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { data, error, isLoading, mutate } = useSWR(`${API}/${id}`, getJson);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const d = data?.data;

  const act = async (key: string, url: string, body?: unknown, done?: string) => {
    setBusy(key); setMsg(null);
    try { await send(url, body); if (done) setMsg({ ok: true, text: done }); await mutate(); onChanged(); return true; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(null); }
  };

  if (isLoading) return <p className="text-[13px] text-graphite">Loading…</p>;
  if (error || !d) return <p className="text-[13px] text-destructive">{error ? String(error.message) : "Not found"}</p>;
  const c = d.check; const s = c.snapshot; const p = s?.profile ?? {};
  const openAlerts = d.alerts.filter((a: any) => !a.acknowledged_at);
  const warnings = d.analysis.flags.filter((f: any) => f.level === "warning");
  const decided = c.status === "satisfactory";

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-ink">{p.company_name || c.company_name || c.company_number}</h2>
          <p className="text-[12px] text-graphite">
            <span className="figure-mono">{c.company_number}</span> · {d.customer?.email} (#{c.user_id}) · extract {fmtDate(c.fetched_at)}
            {c.monitoring && <> · monitoring on</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <Btn disabled={!!busy} onClick={() => act("refresh", `${API}/${id}/refresh`, {}, "Extract refreshed.")}>{busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCcw className="h-4 w-4" aria-hidden />} Refresh</Btn>
          <Btn disabled={!!busy} onClick={() => act("report", `${API}/${id}/reports`, { reason: "Saved by administrator" }, "Report saved.")}><Download className="h-4 w-4" aria-hidden /> Save report</Btn>
        </div>
      </header>
      {c.fetch_error && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Last retrieval failed: {c.fetch_error}</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-[13px]", msg.ok ? "text-primary" : "text-destructive")}>{msg.text}</p>}

      {openAlerts.map((a: any) => <AlertCard key={a.id} alert={a} onAck={note => act(`ack${a.id}`, `${API}/${id}/alerts/${a.id}/ack`, { note }, "Alert acknowledged.")} />)}

      <Decision d={d} busy={busy} act={act} id={id} />

      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-[13px] text-amber-950">
          {warnings.map((f: any, i: number) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span><strong className="font-medium">{f.area}:</strong> {f.text}</span></li>)}
        </ul>
      )}

      <Checklist d={d} disabled={decided || !!busy} act={act} id={id} />

      <Section title="Compared with customer information" count={d.analysis.comparison.length} open>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[12px] text-graphite"><tr><th className="py-1 pr-2 font-medium">Item</th><th className="py-1 pr-2 font-medium">Companies House</th><th className="py-1 pr-2 font-medium">Customer</th><th className="py-1 font-medium">Result</th></tr></thead>
          <tbody className="divide-y divide-line">
            {d.analysis.comparison.map((r: any, i: number) => (
              <tr key={i} className="align-top">
                <td className="py-1.5 pr-2 text-graphite">{r.field}</td><td className="py-1.5 pr-2">{r.register || "—"}</td><td className="py-1.5 pr-2">{r.customer || "—"}</td>
                <td className={cn("py-1.5 whitespace-nowrap", r.result === "differs" ? "font-medium text-amber-800" : r.result === "match" ? "text-primary" : "text-graphite")}>{human(r.result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {s && (
        <>
          <Section title="Company">
            <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1">
              <dt className="text-graphite">Status</dt><dd>{human(p.company_status)}{p.company_status_detail ? ` – ${human(p.company_status_detail)}` : ""}</dd>
              <dt className="text-graphite">Type</dt><dd>{human(p.type)}</dd>
              <dt className="text-graphite">Incorporated</dt><dd>{p.date_of_creation ?? "—"}</dd>
              <dt className="text-graphite">Registered office</dt><dd>{addr(p.registered_office_address)}</dd>
              <dt className="text-graphite">SIC codes</dt><dd className="figure-mono">{(p.sic_codes ?? []).join(", ") || "—"}</dd>
              <dt className="text-graphite">Accounts</dt><dd>last {p.accounts?.last_accounts?.made_up_to ?? "—"}, next due {p.accounts?.next_due ?? "—"}{p.accounts?.overdue && <strong className="text-amber-800"> overdue</strong>}</dd>
              <dt className="text-graphite">Confirmation stmt</dt><dd>last {p.confirmation_statement?.last_made_up_to ?? "—"}, next due {p.confirmation_statement?.next_due ?? "—"}{p.confirmation_statement?.overdue && <strong className="text-amber-800"> overdue</strong>}</dd>
              <dt className="text-graphite">Insolvency</dt><dd>{p.has_insolvency_history || p.has_been_liquidated ? <strong className="text-amber-800">Yes{s.insolvency?.cases?.length ? ` – ${s.insolvency.cases.map((x: any) => human(x.type)).join(", ")}` : ""}</strong> : "None recorded"}</dd>
            </dl>
            <a className="mt-2 inline-block text-[12px] text-ink underline" href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.company_number)}`} target="_blank" rel="noopener noreferrer">Open on Companies House</a>
          </Section>
          <Section title="Officers" count={s.officers.filter((o: any) => !o.resigned_on).length}>
            <ul className="divide-y divide-line">
              {s.officers.map((o: any, i: number) => (
                <li key={i} className={cn("py-1.5", o.resigned_on && "text-graphite")}>
                  <span className="font-medium">{o.name}</span> · {human(o.officer_role)} · appointed {o.appointed_on ?? "—"}{o.resigned_on ? ` · resigned ${o.resigned_on}` : ""}
                  <span className="block text-[12px] text-graphite">
                    {o.country_of_residence ?? "residence not shown"}{o.appointment_count != null ? ` · ${o.appointment_count} appointments` : ""}
                    {o.disqualification?.searched ? (o.disqualification.matches.length ? <strong className="text-amber-800"> · possible disqualification match ({o.disqualification.matches.map((m: any) => m.title).join(", ")})</strong> : " · no disqualification match") : o.resigned_on ? "" : " · not screened"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Persons with significant control" count={s.pscs.filter((x: any) => !x.ceased_on).length}>
            {!s.pscs.length && !s.psc_statements.length && <p className="text-graphite">None on the register.</p>}
            <ul className="divide-y divide-line">
              {s.pscs.map((x: any, i: number) => (
                <li key={i} className={cn("py-1.5", x.ceased_on && "text-graphite")}>
                  <span className="font-medium">{x.name || "(protected)"}</span> · {human(x.kind)}{x.ceased_on ? ` · ceased ${x.ceased_on}` : ""}
                  <span className="block text-[12px] text-graphite">{(x.natures_of_control ?? []).map(human).join("; ")}{x.country_of_residence ? ` · ${x.country_of_residence}` : ""}</span>
                </li>
              ))}
              {s.psc_statements.map((x: any, i: number) => <li key={`s${i}`} className="py-1.5">Statement: {human(x.statement)}{x.ceased_on ? ` (ceased ${x.ceased_on})` : ""}</li>)}
            </ul>
            <p className="mt-2 text-[12px] text-graphite">The PSC register is a starting point only. Verify beneficial owners independently and record how.</p>
          </Section>
          <Section title="Filing history" count={s.filing_history.length}>
            <ul className="space-y-0.5">{s.filing_history.map((f: any, i: number) => <li key={i}><span className="figure-mono text-graphite">{f.date}</span> <span className="figure-mono">{f.type}</span> {human(f.description)}</li>)}</ul>
          </Section>
        </>
      )}

      <Entries d={d} act={act} id={id} busy={busy} />
      <Evidence d={d} act={act} id={id} busy={busy} />

      <Section title="Reports" count={d.reports.length}>
        {!d.reports.length ? <p className="text-graphite">No reports yet. A report is saved automatically with every decision.</p> : (
          <ul className="divide-y divide-line">
            {d.reports.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>{fmtDate(r.created_at)} · {r.reason} · <span className="text-graphite">{STATUS[r.status]?.label ?? r.status}</span></span>
                <a className="inline-flex items-center gap-1 text-ink underline" href={`${API}/${id}/reports/${r.id}`}><Download className="h-3.5 w-3.5" aria-hidden />PDF</a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Monitoring and alert history" count={d.alerts.length}>
        <p className="mb-2">{c.monitoring ? "This company is re-checked about once a day. Changes raise an alert here." : "Monitoring is off."}</p>
        <MonitoringToggle on={c.monitoring} onChange={(enabled, reason) => act("mon", `${API}/${id}/monitoring`, { enabled, reason }, enabled ? "Monitoring on." : "Monitoring off.")} />
        {d.alerts.filter((a: any) => a.acknowledged_at).map((a: any) => (
          <p key={a.id} className="mt-2 text-[12px] text-graphite">{fmtDate(a.detected_at)}: {a.changes.map((x: any) => x.label).join(", ")} — reviewed {fmtDate(a.acknowledged_at)}: {a.note}</p>
        ))}
      </Section>
    </div>
  );
}

function AlertCard({ alert, onAck }: { alert: any; onAck: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  const show = (v: unknown) => (v == null ? "—" : typeof v === "object" ? (Array.isArray(v) ? (v.length ? v.join("; ") : "none") : addr(v)) : String(v));
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-950">
      <p className="flex items-center gap-1.5 font-semibold"><Bell className="h-4 w-4" aria-hidden /> Change found {fmtDate(alert.detected_at)}</p>
      <ul className="mt-1 space-y-0.5">{alert.changes.map((x: any, i: number) => <li key={i}><strong className="font-medium">{x.label}:</strong> {show(x.before)} → {show(x.after)}</li>)}</ul>
      <div className="mt-2 flex gap-2">
        <input className={inputCls} placeholder="What you reviewed and any action taken" value={note} onChange={e => setNote(e.target.value)} aria-label="Review note" />
        <Btn disabled={!note.trim()} onClick={async () => { if (await onAck(note.trim())) setNote(""); }}>Mark reviewed</Btn>
      </div>
      <p className="mt-1 text-[12px]">If the change affects due diligence, move the check to further investigation below; this pauses the customer&apos;s service.</p>
    </div>
  );
}

function Decision({ d, busy, act, id }: { d: any; busy: string | null; act: any; id: number }) {
  const [reason, setReason] = useState("");
  const blockers: string[] = d.satisfactory_blockers ?? [];
  const status = d.check.status;
  return (
    <div className="rounded-md border border-line bg-mist/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ink">Outcome</span>
        <input className={cn(inputCls, "min-w-[200px] flex-1")} placeholder="Reason (required except for satisfactory)" value={reason} onChange={e => setReason(e.target.value)} aria-label="Decision reason" />
        {status !== "satisfactory" && (
          <Btn variant="solid" disabled={!!busy || blockers.length > 0} title={blockers.join(" ")}
            onClick={async () => { if (await act("decide", `${API}/${id}/decision`, { status: "satisfactory", reason }, "Recorded as satisfactory. Report saved and monitoring on.")) setReason(""); }}>
            <Check className="h-4 w-4" aria-hidden /> Satisfactory
          </Btn>
        )}
        {status !== "further_investigation" && (
          <Btn disabled={!!busy || !reason.trim()} onClick={async () => { if (await act("decide", `${API}/${id}/decision`, { status: "further_investigation", reason }, "Moved to further investigation. Report saved.")) setReason(""); }}>Further investigation</Btn>
        )}
        {status !== "in_progress" && (
          <Btn variant="ghost" disabled={!!busy || !reason.trim()} onClick={async () => { if (await act("decide", `${API}/${id}/decision`, { status: "in_progress", reason }, "Reopened.")) setReason(""); }}>Reopen</Btn>
        )}
      </div>
      {status !== "satisfactory" && blockers.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-graphite">{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
      )}
      <p className="mt-2 text-[12px] text-graphite">Until this check is satisfactory the customer has no access to their address details, mail or forwarding. Every decision saves a dated report.</p>
    </div>
  );
}

function Checklist({ d, disabled, act, id }: { d: any; disabled: boolean; act: any; id: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const items: any[] = d.checklist_items ?? [];
  const state = d.check.checklist ?? {};
  const doneCount = items.filter(i => state[i.id]?.done).length;
  const flaggedAreas = useMemo(() => new Set(d.analysis.flags.filter((f: any) => f.level === "warning").map((f: any) => f.area)), [d]);
  const areaFor: Record<string, string[]> = { status: ["Status", "Insolvency"], officers: ["Officers"], disqualifications: ["Disqualification"], filings: ["Filings"], psc: ["PSC"], customer_match: ["Registered office"] };
  const owners = d.customer?.owners ?? [];

  return (
    <div className="rounded-md border border-line">
      <p className="flex items-center justify-between border-b border-line px-3 py-2 text-[13px] font-semibold text-ink">Checklist <span className="font-normal text-graphite">{doneCount} of {items.length} done</span></p>
      <ul className="divide-y divide-line">
        {items.map(i => {
          const v = state[i.id] ?? {};
          const flagged = (areaFor[i.id] ?? []).some(a => flaggedAreas.has(a));
          return (
            <li key={i.id} className="px-3 py-2">
              <div className="flex items-start gap-2.5">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--ink,#123b2c)]" checked={!!v.done} disabled={disabled} aria-label={i.label}
                  onChange={() => {
                    if (v.done) { void act(`item${i.id}`, `${API}/${id}/checklist`, { item: i.id, done: false }); return; }
                    setOpen(i.id); setNote("");
                  }} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className={cn("font-medium", v.done ? "text-ink" : "text-ink")}>{i.label}{flagged && !v.done && <span className="ml-1.5 text-[12px] font-normal text-amber-800">· flags to review</span>}</p>
                  <p className="text-[12px] text-graphite">{i.hint}</p>
                  {i.id === "owner_identity" && (
                    <p className="text-[12px] text-graphite">Account holder identity: {d.customer?.kyc_status ?? "—"}{owners.length ? ` · Declared owners: ${owners.map((o: any) => `${o.full_name} (${o.status ?? "—"})`).join(", ")}` : " · No other owners declared"}</p>
                  )}
                  {v.done && <p className="text-[12px] text-graphite">Done {fmtDate(v.at)} by admin #{v.by}{v.note ? ` — ${v.note}` : ""}</p>}
                  {open === i.id && (
                    <form className="mt-1.5 flex gap-2" onSubmit={async e => {
                      e.preventDefault();
                      if (await act(`item${i.id}`, `${API}/${id}/checklist`, { item: i.id, done: true, note: note.trim() || undefined })) setOpen(null);
                    }}>
                      <input autoFocus className={inputCls} value={note} onChange={e => setNote(e.target.value)} aria-label={`Note for ${i.label}`}
                        placeholder={i.id === "beneficial_owners" ? "How beneficial owners were verified (required unless evidence uploaded)" : flagged ? "Note how the flags were resolved" : "Note (optional)"} />
                      <Btn type="submit" variant="solid">Confirm</Btn>
                      <Btn variant="ghost" onClick={() => setOpen(null)}>Cancel</Btn>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Entries({ d, act, id, busy }: { d: any; act: any; id: number; busy: string | null }) {
  const [kind, setKind] = useState<"note" | "discrepancy">("note");
  const [f, setF] = useState({ body: "", field: "", chValue: "", customerValue: "", material: false });
  const [resolving, setResolving] = useState<number | null>(null);
  const [r, setR] = useState({ resolution: "", reportedToCh: false, reference: "" });
  const open = d.entries.filter((e: any) => e.kind === "discrepancy" && !e.resolved_at).length;
  return (
    <Section title="Discrepancies and notes" count={d.entries.length} open={open > 0}>
      <ul className="mb-3 divide-y divide-line">
        {d.entries.map((e: any) => (
          <li key={e.id} className="py-1.5">
            <p className="text-[12px] text-graphite">{fmtDate(e.created_at)} · admin #{e.admin_id} · {e.kind === "discrepancy" ? <strong className={cn(e.resolved_at ? "text-graphite" : "text-amber-800")}>Discrepancy{e.material ? " (material)" : ""}{e.resolved_at ? " – resolved" : " – open"}</strong> : "Note"}</p>
            {e.kind === "discrepancy" && <p>{e.field}: Companies House “{e.ch_value || "—"}” / customer “{e.customer_value || "—"}”</p>}
            <p>{e.body}</p>
            {e.resolved_at && <p className="text-[12px] text-graphite">Resolved {fmtDate(e.resolved_at)}: {e.resolution}{e.reported_to_ch ? ` · reported to Companies House, ref ${e.report_reference}` : ""}</p>}
            {e.kind === "discrepancy" && !e.resolved_at && (resolving === e.id ? (
              <form className="mt-1.5 space-y-1.5" onSubmit={async ev => { ev.preventDefault(); if (await act(`res${e.id}`, `${API}/${id}/entries/${e.id}/resolve`, r, "Discrepancy resolved.")) { setResolving(null); setR({ resolution: "", reportedToCh: false, reference: "" }); } }}>
                <input className={inputCls} placeholder="How it was resolved" value={r.resolution} onChange={ev => setR({ ...r, resolution: ev.target.value })} aria-label="Resolution" />
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.reportedToCh} onChange={ev => setR({ ...r, reportedToCh: ev.target.checked })} /> Reported to Companies House</label>
                  {r.reportedToCh && <input className={cn(inputCls, "w-48")} placeholder="Report reference" value={r.reference} onChange={ev => setR({ ...r, reference: ev.target.value })} aria-label="Report reference" />}
                  <Btn type="submit" variant="solid" disabled={!!busy || !r.resolution.trim()}>Resolve</Btn>
                  <Btn variant="ghost" onClick={() => setResolving(null)}>Cancel</Btn>
                </div>
                {e.material && <p className="text-[12px] text-graphite">Material discrepancies must be reported to Companies House (MLR reg 30A) before they can be resolved. Report them through Companies House&apos;s discrepancy service.</p>}
              </form>
            ) : <Btn className="mt-1" onClick={() => setResolving(e.id)}>Resolve…</Btn>)}
          </li>
        ))}
      </ul>
      <form className="space-y-1.5 rounded-md border border-line p-2.5" onSubmit={async ev => {
        ev.preventDefault();
        if (await act("entry", `${API}/${id}/entries`, { kind, ...f }, kind === "note" ? "Note added." : "Discrepancy recorded.")) setF({ body: "", field: "", chValue: "", customerValue: "", material: false });
      }}>
        <div className="flex gap-1" role="group" aria-label="Entry type">
          {(["note", "discrepancy"] as const).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("rounded-full px-2.5 py-0.5 text-[12px]", kind === k ? "bg-ink text-paper" : "text-graphite hover:bg-mist")}>{k === "note" ? "Note" : "Discrepancy"}</button>)}
        </div>
        {kind === "discrepancy" && (
          <div className="grid gap-1.5 sm:grid-cols-3">
            <input className={inputCls} placeholder="Field (e.g. PSC, director)" value={f.field} onChange={e => setF({ ...f, field: e.target.value })} aria-label="Field" />
            <input className={inputCls} placeholder="Companies House says" value={f.chValue} onChange={e => setF({ ...f, chValue: e.target.value })} aria-label="Companies House value" />
            <input className={inputCls} placeholder="Customer says" value={f.customerValue} onChange={e => setF({ ...f, customerValue: e.target.value })} aria-label="Customer value" />
          </div>
        )}
        <textarea className={cn(inputCls, "h-16 py-1.5")} placeholder={kind === "note" ? "Administrator note" : "Describe the discrepancy and what you are doing about it"} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} aria-label="Text" />
        <div className="flex items-center justify-between gap-2">
          {kind === "discrepancy" ? <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={f.material} onChange={e => setF({ ...f, material: e.target.checked })} /> Material (possible money laundering or concealment)</label> : <span />}
          <Btn type="submit" variant="solid" disabled={!!busy || !f.body.trim()}>Add</Btn>
        </div>
        {kind === "discrepancy" && <p className="text-[12px] text-graphite">Recording a discrepancy on a satisfactory check moves it to further investigation.</p>}
      </form>
    </Section>
  );
}

function Evidence({ d, act, id, busy }: { d: any; act: any; id: number; busy: string | null }) {
  const [kind, setKind] = useState("beneficial_ownership");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const upload = async () => {
    setErr(null);
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setErr("Files must be 3 MB or smaller."); return; }
    const dataBase64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
    if (await act("evidence", `${API}/${id}/evidence`, { kind, description, filename: file.name, dataBase64 }, "Evidence uploaded.")) { setDescription(""); setFile(null); }
  };
  return (
    <Section title="Supporting evidence" count={d.evidence.length}>
      <ul className="mb-3 divide-y divide-line">
        {d.evidence.map((e: any) => (
          <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0"><span className="font-medium">{human(e.kind)}</span>: {e.description}<span className="block text-[12px] text-graphite">{e.filename} · {Math.ceil(e.size_bytes / 1024)} KB · {fmtDate(e.created_at)} · admin #{e.admin_id}</span></span>
            <a className="shrink-0 text-ink underline" href={`${API}/${id}/evidence/${e.id}`}>Download</a>
          </li>
        ))}
      </ul>
      <div className="grid gap-1.5 sm:grid-cols-[180px_1fr]">
        <select className={inputCls} value={kind} onChange={e => setKind(e.target.value)} aria-label="Evidence type">
          <option value="beneficial_ownership">Beneficial ownership</option>
          <option value="discrepancy_report">Discrepancy report receipt</option>
          <option value="company_document">Company document</option>
          <option value="other">Other</option>
        </select>
        <input className={inputCls} placeholder="What the document shows" value={description} onChange={e => setDescription(e.target.value)} aria-label="Evidence description" />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-[13px]" aria-label="Evidence file" />
        <Btn variant="solid" disabled={!!busy || !file || !description.trim()} onClick={upload}>Upload</Btn>
      </div>
      <p className="mt-1 text-[12px] text-graphite">PDF, PNG or JPEG, up to 3 MB. Uploaded evidence cannot be changed or deleted.</p>
      {err && <p className="text-[13px] text-destructive" role="alert">{err}</p>}
    </Section>
  );
}

function MonitoringToggle({ on, onChange }: { on: boolean; onChange: (enabled: boolean, reason?: string) => void }) {
  const [reason, setReason] = useState("");
  if (!on) return <Btn onClick={() => onChange(true)}>Turn monitoring on</Btn>;
  return (
    <div className="flex gap-2">
      <input className={inputCls} placeholder="Reason for turning monitoring off" value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason for turning monitoring off" />
      <Btn disabled={!reason.trim()} onClick={() => onChange(false, reason.trim())}>Turn off</Btn>
    </div>
  );
}
