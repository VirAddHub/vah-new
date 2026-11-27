"use client";

/**
 * Admin › Company checks. One screen: a work queue (most urgent first) and the selected check.
 * The system retrieves and compares everything it can; the administrator only reviews exceptions,
 * makes the judgements a person must make, and decides. Automated results never approve anyone.
 * Individual identity, address, PEP, sanctions and adverse-media checks are separate.
 */
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Bell, Building2, Check, CircleDashed, Download, ExternalLink, Loader2, Minus, Plus, RefreshCcw, Search, X } from "lucide-react";
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
  in_progress: { label: "Under review", cls: "bg-mist text-ink border-line" },
  further_investigation: { label: "Investigating", cls: "bg-amber-50 text-amber-900 border-amber-200" },
  satisfactory: { label: "Satisfactory", cls: "bg-primary/10 text-primary border-primary/20" },
};
const VIEWS = [
  { id: "action", label: "Needs action" },
  { id: "waiting", label: "Waiting for customer" },
  { id: "satisfactory", label: "Satisfactory" },
  { id: "all", label: "All" },
] as const;
const AUTO: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  pass: { icon: <Check className="h-3.5 w-3.5" aria-hidden />, cls: "text-primary", label: "Passed" },
  attention: { icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />, cls: "text-amber-700", label: "Attention" },
  discrepancy: { icon: <X className="h-3.5 w-3.5" aria-hidden />, cls: "text-red-700", label: "Discrepancy" },
  missing: { icon: <CircleDashed className="h-3.5 w-3.5" aria-hidden />, cls: "text-graphite", label: "Missing" },
  not_available: { icon: <Minus className="h-3.5 w-3.5" aria-hidden />, cls: "text-graphite", label: "Not connected" },
};
const PRIORITY_DOT = (p: number) => (p <= 2 ? "bg-red-600" : p <= 5 ? "bg-amber-500" : p <= 7 ? "bg-graphite/40" : "bg-primary");

const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const day = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const addr = (a: any) => (a ? [a.premises, a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code, a.country].filter(Boolean).join(", ") : "—");
const human = (s: unknown) => String(s ?? "—").replace(/-/g, " ").replace(/_/g, " ");
const by = (id: unknown) => (Number(id) === 0 ? "system" : `admin #${id}`);

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
function Heading({ children, note }: { children: React.ReactNode; note?: string }) {
  return <p className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-2 text-[13px] font-semibold text-ink">{children}{note && <span className="text-[12px] font-normal text-graphite">{note}</span>}</p>;
}

export default function CompanyChecksSection() {
  const [view, setView] = useState<string>("action");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  // Search once typing pauses, and keep the current list on screen while the next one loads.
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const list = useSWR(`${API}?view=${view}&q=${encodeURIComponent(debouncedQ)}`, getJson, { refreshInterval: 60_000, keepPreviousData: true });
  const items: any[] = list.data?.data?.items ?? [];
  const counts = list.data?.data?.counts ?? {};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink"><Building2 className="h-5 w-5" aria-hidden /> Company checks</h1>
          <p className="text-[13px] text-graphite">Companies House checks run automatically. You review exceptions, make the judgements and decide. Identity, address and screening are separate.</p>
        </div>
        <Btn variant="ghost" onClick={() => { setLinking(true); setSelected(null); }}><Plus className="h-4 w-4" aria-hidden /> Link a company by hand</Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <aside className="rounded-lg border border-line bg-paper">
          <div className="space-y-2 border-b border-line p-2.5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Queue">
              {VIEWS.map(v => (
                <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}
                  className={cn("rounded-full px-2.5 py-1 text-[12px]", view === v.id ? "bg-ink text-paper" : "text-graphite hover:bg-mist")}>
                  {v.label}{counts[v.id] != null && <span className="ml-1 opacity-70">{counts[v.id]}</span>}
                </button>
              ))}
            </div>
            <label className="relative block">
              <span className="sr-only">Search checks</span>
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-graphite" aria-hidden />
              <input className={cn(inputCls, "pl-8")} placeholder="Company, number, customer" value={q} onChange={e => setQ(e.target.value)} />
            </label>
          </div>
          {list.isLoading && !items.length ? <p className="p-4 text-[13px] text-graphite">Loading…</p>
            : list.error ? <p className="p-4 text-[13px] text-destructive">{String(list.error.message)}</p>
            : !items.length ? <p className="p-4 text-[13px] text-graphite">{view === "action" ? "Nothing needs action." : "Nothing here."}</p>
            : (
              <ul className="max-h-[72vh] divide-y divide-line overflow-y-auto">
                {items.map(i => (
                  <li key={i.id}>
                    <button type="button" onClick={() => { setSelected(i.id); setLinking(false); }} aria-current={selected === i.id}
                      className={cn("w-full px-3 py-2.5 text-left hover:bg-mist", selected === i.id && "bg-mist")}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{i.company_name || i.company_number}</span>
                        {i.open_alerts > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-900"><Bell className="h-3 w-3" aria-hidden />{i.open_alerts}</span>}
                      </div>
                      <p className="truncate text-[12px] text-graphite"><span className="figure-mono">{i.company_number}</span> · {i.customer_name || i.email}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT(i.next.priority))} aria-hidden />
                        <span className="truncate">{i.next.text}</span>
                        {i.risk_rating && <span className="ml-auto shrink-0 text-graphite">{i.risk_rating} risk</span>}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-paper p-4">
          {linking ? <LinkCompany onCreated={id => { setLinking(false); setSelected(id); void list.mutate(); }} onCancel={() => setLinking(false)} />
            : selected ? <CheckDetail id={selected} onChanged={() => void list.mutate()} />
            : <p className="py-10 text-center text-[13px] text-graphite">{items.length ? "Select a company. The most urgent is at the top." : "Nothing to review."}</p>}
        </section>
      </div>
    </div>
  );
}

function LinkCompany({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [userQ, setUserQ] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [companyQ, setCompanyQ] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const users = useSWR(userQ.trim().length >= 2 && !customer ? `/api/bff/admin/users/search?q=${encodeURIComponent(userQ.trim())}` : null, getJson);
  const companies = useSWR(term ? `${API}/search?q=${encodeURIComponent(term)}` : null, getJson);
  const link = async (companyNumber: string) => {
    setBusy(true); setError(null);
    try { const r = await send(API, { userId: customer.id, companyNumber }); if (r.warning) setError(r.warning); onCreated(Number(r.data.id)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-ink">Link a company by hand</h2><Btn variant="ghost" onClick={onCancel}>Cancel</Btn></div>
      <p className="text-[13px] text-graphite">Customers with a company number are linked automatically. Use this only for a company they have not told us about yet.</p>
      {customer ? (
        <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-[13px]"><span className="font-medium">{customer.email}</span><Btn variant="ghost" onClick={() => setCustomer(null)}>Change</Btn></div>
      ) : (
        <>
          <input className={inputCls} placeholder="Search customers by email or name" value={userQ} onChange={e => setUserQ(e.target.value)} aria-label="Search customers" />
          {(users.data?.data ?? []).length > 0 && (
            <ul className="divide-y divide-line rounded-md border border-line">{(users.data?.data ?? []).slice(0, 8).map((u: any) => (
              <li key={u.id}><button type="button" className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-mist" onClick={() => setCustomer(u)}>{u.email} <span className="text-graphite">· {[u.first_name, u.last_name].filter(Boolean).join(" ")}</span></button></li>))}
            </ul>
          )}
        </>
      )}
      {customer && (
        <>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setTerm(companyQ.trim()); }}>
            <input className={inputCls} placeholder="Company name or number" value={companyQ} onChange={e => setCompanyQ(e.target.value)} aria-label="Search Companies House" />
            <Btn type="submit">Search</Btn>
          </form>
          {companies.error && <p className="text-[13px] text-destructive">{String(companies.error.message)}</p>}
          <ul className="divide-y divide-line rounded-md border border-line empty:hidden">{(companies.data?.data ?? []).map((c: any) => (
            <li key={c.company_number} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
              <span className="min-w-0"><span className="font-medium">{c.title}</span> <span className="figure-mono text-graphite">{c.company_number}</span><span className="block truncate text-[12px] text-graphite">{human(c.company_status)} · {c.address_snippet}</span></span>
              <Btn variant="solid" disabled={busy} onClick={() => link(c.company_number)}>Link</Btn>
            </li>))}
          </ul>
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
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
  const a = d.analysis;
  const openAlerts = d.alerts.filter((x: any) => !x.acknowledged_at);
  const openDisc = d.entries.filter((e: any) => e.kind === "discrepancy" && !e.resolved_at);
  const doneDisc = d.entries.filter((e: any) => e.kind === "discrepancy" && e.resolved_at);
  const notes = d.entries.filter((e: any) => e.kind === "note");
  const decl = d.customer?.declaration;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-ink">{p.company_name || c.company_name || c.company_number}</h2>
          <p className="text-[12px] text-graphite"><span className="figure-mono">{c.company_number}</span> · {d.customer?.first_name} {d.customer?.last_name} ({d.customer?.email}) · extract {day(c.fetched_at)}{c.monitoring && " · monitored daily"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <Btn disabled={!!busy} onClick={() => act("refresh", `${API}/${id}/refresh`, {}, "Re-checked with Companies House.")}>{busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCcw className="h-4 w-4" aria-hidden />} Re-check</Btn>
          <a className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-graphite hover:bg-mist hover:text-ink" href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.company_number)}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden /> Register</a>
        </div>
      </header>

      <div className={cn("rounded-md border p-3", d.next.priority <= 2 ? "border-red-200 bg-red-50/60" : d.next.key === "none" ? "border-primary/20 bg-primary/5" : "border-amber-200 bg-amber-50/60")} role="status">
        <p className="text-[12px] font-medium uppercase tracking-wide text-graphite">Next</p>
        <p className="text-[15px] font-semibold text-ink">{d.next.text}</p>
        {d.next.key === "await_customer" && <p className="mt-1 text-[13px] text-graphite">The customer has been asked for their company declaration on their dashboard. Nothing to do until it arrives.</p>}
        {c.fetch_error && <p className="mt-1 text-[13px] text-amber-900">Last retrieval failed: {c.fetch_error}</p>}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-[13px]", msg.ok ? "text-primary" : "text-destructive")}>{msg.text}</p>}

      {openAlerts.map((al: any) => <AlertCard key={al.id} alert={al} onAck={note => act(`ack${al.id}`, `${API}/${id}/alerts/${al.id}/ack`, { note }, "Alert reviewed.")} />)}

      <AutomatedResults results={a.automated} />

      {a.missing.length > 0 && (
        <div className="rounded-md border border-line">
          <Heading note="Not discrepancies">Missing information</Heading>
          <ul className="space-y-1 px-3 py-2 text-[13px]">{a.missing.map((m: any) => <li key={m.key}><span className="text-graphite">{m.from === "customer" ? "From the customer" : m.from === "register" ? "From Companies House" : "From us"}:</span> {m.text}</li>)}</ul>
        </div>
      )}

      {(openDisc.length > 0 || doneDisc.length > 0) && (
        <div className="rounded-md border border-line">
          <Heading note={openDisc.length ? `${openDisc.length} to resolve` : "All resolved"}>Discrepancies</Heading>
          <ul className="divide-y divide-line">
            {openDisc.map((e: any) => <DiscrepancyRow key={e.id} e={e} onResolve={body => act(`res${e.id}`, `${API}/${id}/entries/${e.id}/resolve`, body, "Discrepancy resolved.")} />)}
          </ul>
          {doneDisc.length > 0 && (
            <details className="border-t border-line px-3 py-2 text-[12px] text-graphite"><summary className="cursor-pointer">{doneDisc.length} resolved</summary>
              <ul className="mt-1 space-y-1">{doneDisc.map((e: any) => <li key={e.id}>{e.body} — {e.resolution}{e.materiality ? ` (${human(e.materiality)})` : ""}{e.reported_to_ch ? `, reported ref ${e.report_reference}` : ""} · {by(e.resolved_by)}, {day(e.resolved_at)}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      <Review d={d} busy={busy} act={act} id={id} />

      <Section title="Declaration compared with the register" count={a.comparison.length} open={!!decl && c.status !== "satisfactory"}>
        {decl ? (
          <>
            <p className="mb-2 text-[12px] text-graphite">Submitted {day(decl.submitted_at)}{decl.returned_at ? ` · returned ${day(decl.returned_at)}: ${decl.returned_reason}` : ""}. Expected mail: {decl.data.expected_monthly_mail} a month. Account holder&apos;s role: {human(decl.data.applicant_role)}.</p>
            <ComparisonTable rows={a.comparison} />
            {!decl.returned_at && <ReturnDeclaration onReturn={reason => act("return", `${API}/${id}/declaration/return`, { reason }, "Returned to the customer.")} />}
          </>
        ) : <p className="text-graphite">No declaration yet.</p>}
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
              <dt className="text-graphite">Accounts</dt><dd>last {p.accounts?.last_accounts?.made_up_to ?? "—"}, next due {p.accounts?.next_due ?? "—"}</dd>
              <dt className="text-graphite">Confirmation stmt</dt><dd>last {p.confirmation_statement?.last_made_up_to ?? "—"}, next due {p.confirmation_statement?.next_due ?? "—"}</dd>
            </dl>
          </Section>
          <Section title="Officers" count={s.officers.filter((o: any) => !o.resigned_on).length}>
            <ul className="divide-y divide-line">{s.officers.map((o: any, i: number) => (
              <li key={i} className={cn("py-1.5", o.resigned_on && "text-graphite")}><span className="font-medium">{o.name}</span> · {human(o.officer_role)} · appointed {o.appointed_on ?? "—"}{o.resigned_on ? ` · resigned ${o.resigned_on}` : ""}
                <span className="block text-[12px] text-graphite">{o.country_of_residence ?? "residence not shown"}{o.appointment_count != null ? ` · ${o.appointment_count} appointments` : ""}</span></li>))}
            </ul>
          </Section>
          <Section title="Persons with significant control" count={s.pscs.filter((x: any) => !x.ceased_on).length}>
            <ul className="divide-y divide-line">
              {s.pscs.map((x: any, i: number) => <li key={i} className={cn("py-1.5", x.ceased_on && "text-graphite")}><span className="font-medium">{x.name || "(protected)"}</span> · {human(x.kind)}<span className="block text-[12px] text-graphite">{(x.natures_of_control ?? []).map(human).join("; ")}</span></li>)}
              {s.psc_statements.map((x: any, i: number) => <li key={`s${i}`} className="py-1.5">Statement: {human(x.statement)}</li>)}
            </ul>
          </Section>
          <Section title="Filing history" count={s.filing_history.length}>
            <ul className="space-y-0.5">{s.filing_history.map((f: any, i: number) => <li key={i}><span className="figure-mono text-graphite">{f.date}</span> <span className="figure-mono">{f.type}</span> {human(f.description)}</li>)}</ul>
          </Section>
        </>
      )}

      <Evidence d={d} act={act} id={id} busy={busy} />
      <Notes notes={notes} onAdd={(kind, body, extra) => act("entry", `${API}/${id}/entries`, { kind, body, ...extra }, kind === "note" ? "Note added." : "Discrepancy recorded.")} />

      <Section title="Reports" count={d.reports.length}>
        {!d.reports.length ? <p className="text-graphite">A dated report is saved automatically when the review is completed and at every decision.</p> : (
          <ul className="divide-y divide-line">{d.reports.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-1.5"><span>{fmtDate(r.created_at)} · {r.reason}</span>
              <a className="inline-flex items-center gap-1 text-ink underline" href={`${API}/${id}/reports/${r.id}`}><Download className="h-3.5 w-3.5" aria-hidden />PDF</a></li>))}
          </ul>
        )}
        <Btn className="mt-2" disabled={!!busy} onClick={() => act("report", `${API}/${id}/reports`, { reason: "Saved by administrator" }, "Report saved.")}>Save a report now</Btn>
      </Section>

      <Section title="Monitoring and history" count={d.alerts.length}>
        <p className="mb-2">{c.monitoring ? "Re-checked daily. Changes raise an alert; a new discrepancy re-opens the review and pauses the customer's service." : "Not monitored yet: monitoring starts automatically when the review is completed."}</p>
        {c.monitoring && <MonitoringOff onOff={reason => act("mon", `${API}/${id}/monitoring`, { enabled: false, reason }, "Monitoring off.")} />}
        {!c.monitoring && c.status === "satisfactory" && <Btn onClick={() => act("mon", `${API}/${id}/monitoring`, { enabled: true }, "Monitoring on.")}>Turn monitoring on</Btn>}
        {d.alerts.filter((x: any) => x.acknowledged_at).map((x: any) => <p key={x.id} className="mt-2 text-[12px] text-graphite">{fmtDate(x.detected_at)}: {x.changes.map((y: any) => y.label).join(", ")} — reviewed: {x.note}</p>)}
        {d.identity?.length > 0 && <p className="mt-2 text-[12px] text-graphite">Identity results on file: {d.identity.map((r: any) => `${human(r.subject)} ${r.outcome} (${human(r.method)}, ${day(r.created_at)})`).join("; ")}.</p>}
      </Section>
    </div>
  );
}

const ORDER: Record<string, number> = { discrepancy: 0, attention: 1, missing: 2, not_available: 3, pass: 4 };
function AutoRow({ x }: { x: any }) {
  const st = AUTO[x.status] ?? AUTO.missing;
  return (
    <li className="grid grid-cols-[18px_minmax(140px,220px)_1fr] items-start gap-2 px-3 py-1.5 text-[13px]">
      <span className={cn("mt-0.5", st.cls)} title={st.label}>{st.icon}<span className="sr-only">{st.label}</span></span>
      <span className="font-medium text-ink">{x.label}</span>
      <span className={cn(x.status === "pass" ? "text-graphite" : "text-ink")}>{x.detail}</span>
    </li>
  );
}
/** Exceptions first; passed checks folded into one line. */
function AutomatedResults({ results }: { results: any[] }) {
  const sorted = [...results].sort((x, y) => (ORDER[x.status] ?? 5) - (ORDER[y.status] ?? 5));
  const passed = sorted.filter(x => x.status === "pass");
  const rest = sorted.filter(x => x.status !== "pass");
  return (
    <div className="rounded-md border border-line">
      <Heading note="Checked by the system: no ticking needed">Automated results</Heading>
      <ul className="divide-y divide-line">{rest.map(x => <AutoRow key={x.id} x={x} />)}</ul>
      {passed.length > 0 && (
        <details className="border-t border-line">
          <summary className="cursor-pointer list-none px-3 py-1.5 text-[13px]"><span className="inline-flex items-center gap-1.5 font-medium text-primary"><Check className="h-3.5 w-3.5" aria-hidden />{passed.length} checks passed</span> <span className="text-graphite">· {passed.map(x => x.label).join(" · ")}</span></summary>
          <ul className="divide-y divide-line border-t border-line">{passed.map(x => <AutoRow key={x.id} x={x} />)}</ul>
        </details>
      )}
    </div>
  );
}

function ComparisonTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="text-[12px] text-graphite"><tr><th className="py-1 pr-2 font-medium">Item</th><th className="py-1 pr-2 font-medium">Companies House</th><th className="py-1 pr-2 font-medium">Customer</th><th className="py-1 font-medium">Result</th></tr></thead>
      <tbody className="divide-y divide-line">
        {rows.map((r: any, i: number) => (
          <tr key={i} className="align-top"><td className="py-1.5 pr-2 text-graphite">{r.field}</td><td className="py-1.5 pr-2">{r.register || "—"}</td><td className="py-1.5 pr-2">{r.customer || "—"}</td>
            <td className={cn("whitespace-nowrap py-1.5", r.result === "differs" ? "font-medium text-red-700" : r.result === "match" ? "text-primary" : "text-graphite")}>{r.result === "review" ? "for you to judge" : human(r.result)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function DiscrepancyRow({ e, onResolve }: { e: any; onResolve: (body: any) => Promise<boolean> }) {
  const bo = e.category === "beneficial_ownership" || (e.category == null && e.material);
  const [open, setOpen] = useState(false);
  const [materiality, setMateriality] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [reference, setReference] = useState("");
  return (
    <li className="px-3 py-2 text-[13px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={cn("mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium", bo ? "bg-red-50 text-red-800" : "bg-mist text-ink")}>{bo ? "Beneficial ownership" : "Other"}</span>
          {e.body}
          <p className="text-[12px] text-graphite">Register: {e.ch_value || "—"} · Customer: {e.customer_value || "—"} · found by {by(e.admin_id)}, {day(e.created_at)}</p>
        </div>
        {!open && <Btn onClick={() => setOpen(true)}>Resolve…</Btn>}
      </div>
      {open && (
        <form className="mt-2 space-y-2 rounded-md bg-mist/50 p-2.5" onSubmit={async ev => { ev.preventDefault(); if (await onResolve({ resolution, materiality: bo ? materiality : undefined, reference })) setOpen(false); }}>
          {bo ? (
            <fieldset className="space-y-1">
              <legend className="text-[12px] text-graphite">PSC discrepancies are reported to Companies House only if material: reasonably linked to money laundering, terrorist financing or concealing details of the business (MLR reg 30A).</legend>
              {[["register_corrected", "The register has been corrected (re-check confirms)"], ["not_material", "Not material: explain why"], ["material", "Material: reported to Companies House"]].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2"><input type="radio" name={`m${e.id}`} checked={materiality === v} onChange={() => setMateriality(v)} /> {l}</label>
              ))}
              {materiality === "material" && (
                <p className="text-[12px]">Report it with Companies House&apos;s discrepancy service, then enter the reference. <a className="underline" href="https://www.gov.uk/guidance/report-a-discrepancy-about-a-beneficial-owner-on-the-psc-register-by-an-obliged-entity" target="_blank" rel="noopener noreferrer">Guidance</a></p>
              )}
            </fieldset>
          ) : <p className="text-[12px] text-graphite">Not reportable to Companies House (only PSC discrepancies are). Explain how it was resolved.</p>}
          <input className={inputCls} placeholder={materiality === "not_material" ? "Why it is not material (at least 20 characters)" : "How it was resolved"} value={resolution} onChange={ev => setResolution(ev.target.value)} aria-label="Resolution" />
          {materiality === "material" && <input className={inputCls} placeholder="Companies House report reference" value={reference} onChange={ev => setReference(ev.target.value)} aria-label="Report reference" />}
          <div className="flex gap-2"><Btn type="submit" variant="solid" disabled={!resolution.trim() || (bo && !materiality)}>Resolve</Btn><Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div>
        </form>
      )}
    </li>
  );
}

function Review({ d, busy, act, id }: { d: any; busy: string | null; act: any; id: number }) {
  const c = d.check;
  const attention = d.analysis.attention;
  const items = (d.judgement_items ?? []).filter((j: any) => j.id !== "warnings_reviewed" || attention > 0);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<string>(c.risk_rating ?? "");
  const [ratingReason, setRatingReason] = useState<string>(c.risk_reason ?? "");
  const [reason, setReason] = useState("");
  const decided = c.status === "satisfactory";
  const blockers: string[] = d.satisfactory_blockers ?? [];
  const boEvidence = d.evidence.filter((e: any) => e.kind === "beneficial_ownership").length;

  return (
    <div className="rounded-md border border-line">
      <Heading note={decided ? `Completed ${day(c.decided_at)}` : undefined}>Your review</Heading>
      <ul className="divide-y divide-line">
        {items.map((j: any) => {
          const v = c.checklist?.[j.id] ?? {};
          return (
            <li key={j.id} className="px-3 py-2 text-[13px]">
              <div className="flex items-start gap-2.5">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!v.done} disabled={decided || !!busy} aria-label={j.label}
                  onChange={() => { if (v.done) void act(`j${j.id}`, `${API}/${id}/judgement`, { item: j.id, done: false }); else { setOpen(j.id); setNote(""); } }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{j.label}</p>
                  <p className="text-[12px] text-graphite">{j.hint}{j.id === "beneficial_owners" && boEvidence ? ` ${boEvidence} evidence file(s) uploaded.` : ""}</p>
                  {v.done && <p className="text-[12px] text-graphite">Done {day(v.at)} by {by(v.by)}{v.note ? ` — ${v.note}` : ""}</p>}
                  {open === j.id && (
                    <form className="mt-1.5 flex gap-2" onSubmit={async e => { e.preventDefault(); if (await act(`j${j.id}`, `${API}/${id}/judgement`, { item: j.id, done: true, note: note.trim() || undefined })) setOpen(null); }}>
                      <input autoFocus className={inputCls} value={note} onChange={e => setNote(e.target.value)} aria-label={`Note for ${j.label}`}
                        placeholder={j.id === "beneficial_owners" ? (boEvidence ? "Note (optional: evidence uploaded)" : "How you verified the beneficial owners (at least 20 characters)") : j.id === "warnings_reviewed" ? "What you concluded" : "Note (optional)"} />
                      <Btn type="submit" variant="solid">Confirm</Btn><Btn variant="ghost" onClick={() => setOpen(null)}>Cancel</Btn>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        <li className="px-3 py-2 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">Risk rating</span>
            <select className={cn(inputCls, "w-28")} value={rating} onChange={e => setRating(e.target.value)} disabled={decided} aria-label="Risk rating">
              <option value="">Choose…</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <input className={cn(inputCls, "min-w-[180px] flex-1")} placeholder="Reason for the rating" value={ratingReason} onChange={e => setRatingReason(e.target.value)} disabled={decided} aria-label="Reason for the risk rating" />
            {!decided && (rating !== (c.risk_rating ?? "") || ratingReason !== (c.risk_reason ?? "")) && <Btn disabled={!rating || ratingReason.trim().length < 10} onClick={() => act("risk", `${API}/${id}/risk`, { rating, reason: ratingReason }, "Risk rating saved.")}>Save</Btn>}
          </div>
        </li>
      </ul>
      <div className="border-t border-line bg-mist/40 p-3">
        {!decided && blockers.length > 0 && <ul className="mb-2 list-disc space-y-0.5 pl-5 text-[12px] text-graphite">{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>}
        <div className="flex flex-wrap items-center gap-2">
          {!decided && <Btn variant="solid" disabled={!!busy || blockers.length > 0} onClick={() => act("decide", `${API}/${id}/decision`, { status: "satisfactory" }, "Review completed. Report saved; monitoring on.")}><Check className="h-4 w-4" aria-hidden /> Complete review: satisfactory</Btn>}
          <input className={cn(inputCls, "min-w-[180px] flex-1")} placeholder="Reason (for investigation or reopening)" value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason" />
          {c.status !== "further_investigation" && <Btn disabled={!!busy || !reason.trim()} onClick={async () => { if (await act("decide", `${API}/${id}/decision`, { status: "further_investigation", reason }, "Moved to investigation. Report saved.")) setReason(""); }}>Investigate</Btn>}
          {c.status !== "in_progress" && <Btn variant="ghost" disabled={!!busy || !reason.trim()} onClick={async () => { if (await act("decide", `${API}/${id}/decision`, { status: "in_progress", reason }, "Reopened.")) setReason(""); }}>Reopen</Btn>}
        </div>
        <p className="mt-2 text-[12px] text-graphite">Completing the review does not approve the customer on its own: identity, payment and every other condition still apply. Investigating pauses their service.</p>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAck }: { alert: any; onAck: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState("");
  const show = (v: unknown) => (v == null ? "—" : typeof v === "object" ? (Array.isArray(v) ? (v.length ? v.join("; ") : "none") : addr(v)) : String(v));
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-950">
      <p className="flex items-center gap-1.5 font-semibold"><Bell className="h-4 w-4" aria-hidden /> Register changed {fmtDate(alert.detected_at)}</p>
      <ul className="mt-1 space-y-0.5">{alert.changes.map((x: any, i: number) => <li key={i}><strong className="font-medium">{x.label}:</strong> {show(x.before)} → {show(x.after)}</li>)}</ul>
      <div className="mt-2 flex gap-2">
        <input className={inputCls} placeholder="What you reviewed and any action taken" value={note} onChange={e => setNote(e.target.value)} aria-label="Review note" />
        <Btn disabled={!note.trim()} onClick={async () => { if (await onAck(note.trim())) setNote(""); }}>Mark reviewed</Btn>
      </div>
    </div>
  );
}

function ReturnDeclaration({ onReturn }: { onReturn: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) return <Btn className="mt-2" variant="ghost" onClick={() => setOpen(true)}>Ask the customer to correct it…</Btn>;
  return (
    <div className="mt-2 flex gap-2">
      <input className={inputCls} placeholder="What the customer needs to correct (they will see this)" value={reason} onChange={e => setReason(e.target.value)} aria-label="What to correct" />
      <Btn disabled={reason.trim().length < 10} onClick={async () => { if (await onReturn(reason.trim())) setOpen(false); }}>Return</Btn>
      <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
    </div>
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
      <ul className="mb-2 divide-y divide-line empty:hidden">{d.evidence.map((e: any) => (
        <li key={e.id} className="flex items-center justify-between gap-2 py-1.5"><span className="min-w-0">{human(e.kind)}: {e.description}<span className="block text-[12px] text-graphite">{e.filename} · {day(e.created_at)} · admin #{e.admin_id}</span></span>
          <a className="shrink-0 text-ink underline" href={`${API}/${id}/evidence/${e.id}`}>Download</a></li>))}
      </ul>
      <div className="grid gap-1.5 sm:grid-cols-[170px_1fr]">
        <select className={inputCls} value={kind} onChange={e => setKind(e.target.value)} aria-label="Evidence type">
          <option value="beneficial_ownership">Beneficial ownership</option><option value="discrepancy_report">Discrepancy report receipt</option>
          <option value="company_document">Company document</option><option value="other">Other</option>
        </select>
        <input className={inputCls} placeholder="What the document shows" value={description} onChange={e => setDescription(e.target.value)} aria-label="Evidence description" />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-[13px]" aria-label="Evidence file" />
        <Btn variant="solid" disabled={!!busy || !file || !description.trim()} onClick={upload}>Upload</Btn>
      </div>
      <p className="mt-1 text-[12px] text-graphite">PDF, PNG or JPEG up to 3 MB. Evidence cannot be changed or deleted.</p>
      {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
    </Section>
  );
}

function Notes({ notes, onAdd }: { notes: any[]; onAdd: (kind: "note" | "discrepancy", body: string, extra?: any) => Promise<boolean> }) {
  const [kind, setKind] = useState<"note" | "discrepancy">("note");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("other");
  const sorted = useMemo(() => [...notes].reverse(), [notes]);
  return (
    <Section title="Notes" count={notes.length}>
      <ul className="mb-2 space-y-1.5 empty:hidden">{sorted.map((n: any) => <li key={n.id}><span className="text-[12px] text-graphite">{fmtDate(n.created_at)} · {by(n.admin_id)}:</span> {n.body}</li>)}</ul>
      <form className="space-y-1.5" onSubmit={async e => { e.preventDefault(); if (await onAdd(kind, body, kind === "discrepancy" ? { category } : undefined)) setBody(""); }}>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1"><input type="radio" checked={kind === "note"} onChange={() => setKind("note")} /> Note</label>
          <label className="flex items-center gap-1"><input type="radio" checked={kind === "discrepancy"} onChange={() => setKind("discrepancy")} /> Discrepancy you found yourself</label>
          {kind === "discrepancy" && <select className={cn(inputCls, "h-7 w-auto")} value={category} onChange={e => setCategory(e.target.value)} aria-label="Discrepancy category"><option value="other">Other</option><option value="beneficial_ownership">Beneficial ownership (PSC)</option></select>}
        </div>
        <div className="flex gap-2"><input className={inputCls} value={body} onChange={e => setBody(e.target.value)} placeholder={kind === "note" ? "Administrator note" : "Describe the discrepancy"} aria-label="Text" /><Btn type="submit" variant="solid" disabled={!body.trim()}>Add</Btn></div>
      </form>
    </Section>
  );
}

function MonitoringOff({ onOff }: { onOff: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="flex gap-2">
      <input className={inputCls} placeholder="Reason for turning monitoring off" value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason for turning monitoring off" />
      <Btn disabled={!reason.trim()} onClick={() => onOff(reason.trim())}>Turn off</Btn>
    </div>
  );
}
