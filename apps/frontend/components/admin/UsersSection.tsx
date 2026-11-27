"use client";

/**
 * Admin › Customers. Same shape as Company checks: a list grouped by what happens next, and the
 * selected customer beside it with everything needed to act on them.
 *
 * Status and "next step" come from the server's access decision (the same rules the API enforces);
 * nothing here works access out for itself. Identity results are recorded through the permanent,
 * audited identity record; there is no control that sets a status by hand. Paid access only ever
 * comes from Stripe, so there is no plan-status control either.
 */
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, KeyRound, Loader2, Unlock, Pencil, Plus, Search, ShieldAlert, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountStandingDialog } from "./AccountStandingDialog";
import { IdentityResults } from "./IdentityResults";
import { AdminAccessControl } from "./AdminAccessControl";

const PAGE = 50;
const getJson = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || j?.ok === false) throw new Error(j?.message || (j?.error ? String(j.error).replace(/_/g, " ") : `Request failed (${r.status})`));
  return j;
};
async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, credentials: "include", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok || j?.ok === false) throw new Error(j?.message || (j?.error ? String(j.error).replace(/_/g, " ") : `Request failed (${r.status})`));
  return j;
}

const TABS = [
  { id: "needs_you", label: "Needs you", empty: "Nobody is waiting on you." },
  { id: "waiting", label: "Waiting on customer", empty: "Nobody is part-way through setting up." },
  { id: "active", label: "Active", empty: "No active customers." },
  { id: "restricted", label: "Restricted", empty: "No suspended, overdue or refused accounts." },
  { id: "all", label: "All", empty: "No accounts." },
  { id: "closed", label: "Closed", empty: "No closed accounts." },
] as const;
type TabId = (typeof TABS)[number]["id"];

const DOT: Record<string, string> = { needs_you: "bg-amber-500", waiting: "bg-graphite/40", active: "bg-primary", restricted: "bg-red-600", staff: "bg-ink", closed: "bg-graphite/40" };
const name = (u: any) => [u?.first_name, u?.last_name].filter(Boolean).join(" ");
const day = (v: unknown) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  const d = Number.isFinite(n) && String(v).length >= 12 ? new Date(n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const money = (pence: unknown) => (pence == null ? "—" : `£${(Number(pence) / 100).toFixed(2)}`);
const cap = (v: unknown) => (v == null || v === "" ? "—" : String(v).replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()));
const plan = (u: any) => (u?.plan_interval === "year" ? "Annual" : u?.plan_interval === "month" ? "Monthly" : u?.plan_name || "No plan");
const locked = (u: any) => !!u?.locked_until && Number(u.locked_until) > Date.now();

function Btn({ className, variant = "outline", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "solid" | "ghost" | "danger" }) {
  return (
    <button type="button" {...p}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variant === "solid" && "bg-ink text-paper hover:opacity-90",
        variant === "outline" && "border border-line bg-paper text-ink hover:bg-mist",
        variant === "ghost" && "text-graphite hover:bg-mist hover:text-ink",
        variant === "danger" && "border border-red-200 bg-paper text-red-700 hover:bg-red-50", className)} />
  );
}
const inputCls = "h-9 w-full rounded-md border border-line bg-paper px-2.5 text-[14px] text-ink placeholder:text-graphite focus:outline-none focus:ring-2 focus:ring-ink/20";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-ink">{label}<div className="mt-1 font-normal">{children}</div></label>;
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-white p-5 text-ink shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-semibold">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 rounded-md p-1 text-graphite hover:bg-mist"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersSection() {
  const [tab, setTab] = useState<TabId>("needs_you");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setSearch(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  // Current accounts: one request gives the page, the total and the count for every tab.
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE), ...(search ? { search } : {}), ...(tab !== "all" && tab !== "closed" ? { stage: tab } : {}) });
  const list = useSWR(tab === "closed" ? null : `/api/admin/users?${params}`, getJson, { keepPreviousData: true, revalidateOnFocus: true });
  // Closed accounts have their own endpoint; its count is fetched once for the tab label.
  const closedParams = new URLSearchParams({ page: String(page), limit: String(PAGE), ...(search ? { q: search } : {}) });
  const closed = useSWR(tab === "closed" ? `/api/admin/users/deleted?${closedParams}` : null, getJson, { keepPreviousData: true });
  const stats = useSWR("/api/admin/users/stats", getJson, { revalidateOnFocus: false });

  const current = tab === "closed" ? closed : list;
  const items: any[] = tab === "closed" ? (closed.data?.data ?? []) : (list.data?.items ?? []);
  const total: number = tab === "closed" ? Number(closed.data?.pagination?.total ?? 0) : Number(list.data?.total ?? 0);
  const counts: Record<string, number> = { ...(list.data?.counts ?? {}), closed: stats.data?.data?.deleted };
  const refresh = async () => { await Promise.all([list.mutate(), closed.mutate(), stats.mutate()]); };
  const pick = (t: TabId) => { setTab(t); setPage(1); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink"><Users className="h-5 w-5" aria-hidden /> Customers</h1>
          <p className="text-[13px] text-graphite">Grouped by what happens next. Select a customer to see their details and act.</p>
        </div>
        <Btn variant="solid" onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> Create account</Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <aside className={cn("rounded-lg border border-line bg-paper", selected && "hidden lg:block")}>
          <div className="space-y-2 border-b border-line p-2.5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Customer list">
              {TABS.map(t => (
                <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => pick(t.id)}
                  className={cn("rounded-full px-2.5 py-1 text-[12px]", tab === t.id ? "bg-ink text-paper" : "text-graphite hover:bg-mist")}>
                  {t.label}{counts[t.id] != null && <span className="ml-1 opacity-70">{counts[t.id]}</span>}
                </button>
              ))}
            </div>
            <label className="relative block">
              <span className="sr-only">Find a customer</span>
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-graphite" aria-hidden />
              <input className={cn(inputCls, "pl-8")} type="search" placeholder="Name, email, company or #ID" value={q} onChange={e => setQ(e.target.value)} />
            </label>
            {search && tab !== "all" && tab !== "closed" && (counts.all ?? 0) > total && (
              <button type="button" className="text-[12px] text-ink underline" onClick={() => pick("all")}>{counts.all} match in All</button>
            )}
          </div>

          {current.isLoading && !items.length ? <p className="p-4 text-[13px] text-graphite" role="status">Loading…</p>
            : current.error ? (
              <div className="space-y-2 p-4 text-[13px]" role="alert">
                <p className="text-destructive">Could not load {tab === "closed" ? "closed accounts" : "customers"}: {String(current.error.message)}</p>
                <Btn onClick={() => void current.mutate()}>Try again</Btn>
              </div>
            )
            : !items.length ? <p className="p-4 text-[13px] text-graphite">{search ? "No matching customers." : TABS.find(t => t.id === tab)!.empty}</p>
            : (
              <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto" aria-label="Customers">
                {items.map(u => {
                  const stage = tab === "closed" ? "closed" : u.stage;
                  return (
                    <li key={u.id}>
                      <button type="button" onClick={() => setSelected({ ...u, closed: tab === "closed" })} aria-current={selected?.id === u.id}
                        className={cn("w-full px-3 py-2.5 text-left hover:bg-mist", selected?.id === u.id && "bg-mist")}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-[14px] font-medium text-ink">{name(u) || u.email || u.original_email}</span>
                          <span className="figure-mono shrink-0 text-[12px] text-graphite">#{u.id}</span>
                        </div>
                        <p className="truncate text-[12px] text-graphite">{[name(u) ? (u.email ?? u.original_email) : null, u.company_name].filter(Boolean).join(" · ") || "—"}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[stage] ?? "bg-graphite/40")} aria-hidden />
                          <span className="truncate">{tab === "closed" ? `Closed ${day(u.deleted_at)}` : u.service_label ?? "Unknown"}</span>
                          {tab !== "closed" && u.plan_interval && <span className="ml-auto shrink-0 text-graphite">{plan(u)}</span>}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          {total > PAGE && (
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[12px] text-graphite">
              <span>{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total}</span>
              <span className="flex gap-1">
                <Btn variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Btn>
                <Btn variant="ghost" disabled={page * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next</Btn>
              </span>
            </div>
          )}
        </aside>

        <section className={cn("min-w-0 rounded-lg border border-line bg-paper p-4", !selected && "hidden lg:block")}>
          {selected
            ? <CustomerDetail key={selected.id} row={selected} onBack={() => setSelected(null)} onChanged={refresh} />
            : <p className="py-10 text-center text-[13px] text-graphite">{items.length ? "Select a customer." : "Nothing to show."}</p>}
        </section>
      </div>

      {creating && <CreateAccount onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await refresh(); }} />}
    </div>
  );
}

const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "mail", label: "Mail" },
  { id: "billing", label: "Billing" },
  { id: "history", label: "History" },
] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2">
      <dt className="text-graphite">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}
function Loadable({ s, empty, children }: { s: { isLoading: boolean; error?: any }; empty?: boolean; children: React.ReactNode }) {
  if (s.isLoading) return <p className="py-6 text-[13px] text-graphite" role="status">Loading…</p>;
  if (s.error) return <p className="py-6 text-[13px] text-destructive" role="alert">Could not load this: {String(s.error.message)}</p>;
  if (empty) return <p className="py-6 text-[13px] text-graphite">Nothing recorded yet.</p>;
  return <>{children}</>;
}

function CustomerDetail({ row, onBack, onChanged }: { row: any; onBack: () => void; onChanged: () => Promise<void> }) {
  const id = row.id;
  const [tab, setTab] = useState<(typeof DETAIL_TABS)[number]["id"]>("overview");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "standing" | "delete" | "restore">(null);
  const profile = useSWR(row.closed ? null : `/api/admin/users/${id}`, getJson);
  const standing = useSWR(row.closed || (tab !== "overview" && tab !== "history") ? null : `/api/bff/admin/users/${id}/standing`, getJson);
  const mail = useSWR(tab === "mail" ? `/api/admin/mail-items?user_id=${id}&limit=50` : null, getJson);
  const billing = useSWR(tab === "billing" ? `/api/bff/admin/invoices?user_id=${id}&pageSize=50` : null, getJson);
  const p = profile.data?.data ?? {};
  const s = standing.data?.data;
  const email = p.email ?? row.email ?? row.original_email;
  const mailItems: any[] = mail.data?.items ?? mail.data?.data ?? [];
  const invoices: any[] = billing.data?.data?.items ?? [];

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await Promise.all([onChanged(), profile.mutate(), standing.mutate()]); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(null); }
  };
  const company = s?.access?.company;

  if (row.closed) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-graphite hover:text-ink lg:hidden"><ChevronLeft className="h-4 w-4" aria-hidden /> All customers</button>
        <h2 className="text-[17px] font-semibold text-ink">{name(row) || row.original_email || row.email} <span className="font-normal text-graphite">· #{id}</span></h2>
        <div className="rounded-md border border-line bg-mist/40 p-3 text-[13px]">Closed {day(row.deleted_at)}. Records are kept as the law requires.</div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-[13px]", msg.ok ? "text-primary" : "text-destructive")}>{msg.text}</p>}
        <Btn onClick={() => setDialog("restore")}>Restore account…</Btn>
        {dialog === "restore" && <RestoreAccount row={row} onClose={() => setDialog(null)} onDone={async t => { setDialog(null); setMsg({ ok: true, text: t }); await onChanged(); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-graphite hover:text-ink lg:hidden"><ChevronLeft className="h-4 w-4" aria-hidden /> All customers</button>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-semibold text-ink">{name(p) || name(row) || email}</h2>
          <p className="text-[13px] text-graphite">{email} · <span className="figure-mono">#{id}</span>{(p.company_name ?? row.company_name) ? ` · ${p.company_name ?? row.company_name}` : ""}{p.is_admin ? " · administrator" : ""}</p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-ink")}>
          <span className={cn("h-2 w-2 rounded-full", DOT[row.stage] ?? "bg-graphite/40")} aria-hidden />{row.service_label ?? "Unknown"}
        </span>
      </header>

      {row.next_step && (
        <div className={cn("rounded-md border p-3", row.stage === "needs_you" ? "border-amber-200 bg-amber-50/60" : row.stage === "restricted" ? "border-red-200 bg-red-50/60" : "border-line bg-mist/40")} role="status">
          <p className="text-[12px] font-medium uppercase tracking-wide text-graphite">Next</p>
          <p className="text-[15px] font-semibold text-ink">{row.next_step}</p>
          {row.service_label === "Verification in review" && <a className="mt-1 inline-block text-[13px] text-ink underline" href="#identity" onClick={() => setTab("overview")}>Go to Identity</a>}
          {row.service_label === "Company review" && <a className="mt-1 inline-block text-[13px] text-ink underline" href="/admin/dashboard?section=company-checks">Open Company checks</a>}
        </div>
      )}
      {locked(row) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[13px]">
          <span>Sign-in blocked until {new Date(Number(row.locked_until)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} after too many wrong passwords.</span>
          <Btn disabled={!!busy} onClick={() => act("unlock", () => call(`/api/admin/users/${id}/unlock-account`, "POST", {}), "Sign-in block cleared.")}><Unlock className="h-4 w-4" aria-hidden /> Clear block</Btn>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setDialog("edit")} disabled={!profile.data}><Pencil className="h-4 w-4" aria-hidden /> Edit details</Btn>
        <Btn disabled={!!busy} onClick={() => act("reset", () => call(`/api/admin/users/send-password-reset?id=${id}`, "POST"), `Password reset email sent to ${email}.`)}>
          {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />} Send password reset
        </Btn>
        <Btn onClick={() => setDialog("standing")}><ShieldAlert className="h-4 w-4" aria-hidden /> Suspend, restore or close…</Btn>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-[13px]", msg.ok ? "text-primary" : "text-destructive")}>{msg.text}</p>}

      <div role="tablist" aria-label="Customer details" className="flex gap-1 border-b border-line">
        {DETAIL_TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("-mb-px h-9 border-b-2 px-3 text-[13px]", tab === t.id ? "border-ink font-medium text-ink" : "border-transparent text-graphite hover:text-ink")}>{t.label}</button>
        ))}
      </div>

      <div role="tabpanel" className="text-[13px]">
        {tab === "overview" && (
          <Loadable s={profile}>
            <dl className="divide-y divide-line">
              <Row label="Phone">{p.phone || "—"}</Row>
              <Row label="Plan">{plan(row)}</Row>
              <Row label="Payment">{cap(s?.access?.payment?.state)}</Row>
              <Row label="Identity">{cap(s?.access?.verification?.state ?? p.kyc_status)}</Row>
              <Row label="Company">
                {!company ? "—" : company.preIncorporation ? `Being formed (${cap(company.preIncorporation).toLowerCase()})`
                  : company.required === 0 ? "Not a company"
                  : `${company.satisfactory} of ${company.required} checked${company.investigating ? `, ${company.investigating} under investigation` : ""}${company.declarationNeeded ? ", details not received" : ""}`}
                {company && company.required > 0 && <a className="ml-2 underline" href="/admin/dashboard?section=company-checks">Open</a>}
              </Row>
              <Row label="Joined">{day(p.created_at ?? row.created_at)}</Row>
              <Row label="Last sign-in">{day(p.last_login_at ?? row.last_login_at)}</Row>
            </dl>
            <div id="identity" className="scroll-mt-24"><IdentityResults userId={id} /></div>
            {profile.data && <AdminAccessControl userId={id} email={email} isAdmin={Boolean(p.is_admin)} onChanged={() => { void profile.mutate(); void onChanged(); }} />}
            <details className="mt-6 rounded-md border border-red-200 px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-medium text-red-800">Delete permanently</summary>
              <p className="mt-2 text-[13px] text-graphite">Only for accounts created by mistake. To end a customer's service, use Suspend, restore or close: it keeps the records the law requires.</p>
              <Btn variant="danger" className="mt-2" onClick={() => setDialog("delete")}>Delete permanently…</Btn>
            </details>
          </Loadable>
        )}

        {tab === "mail" && (
          <Loadable s={mail} empty={!mailItems.length}>
            <ul className="divide-y divide-line">
              {mailItems.map(m => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="min-w-0 truncate text-ink">{m.subject || m.sender_name || `Item #${m.id}`}</span>
                  <span className="figure-mono shrink-0 text-graphite">{day(m.received_at_ms ?? m.received_date ?? m.created_at)}</span>
                </li>
              ))}
            </ul>
          </Loadable>
        )}

        {tab === "billing" && (
          <>
            <dl className="mb-3 divide-y divide-line">
              <Row label="Recurring rate">{p.subscription_rate ? <span className="figure-mono">{money(p.subscription_rate.amount_pence)} / {p.subscription_rate.interval === "year" ? "year" : "month"}</span> : profile.isLoading ? "Loading…" : "No Stripe subscription"}</Row>
              {p.subscription_rate && <>
                <Row label="Stripe status">{p.subscription_rate.status}{p.subscription_rate.cancel_at_period_end ? " (ends at period end)" : ""}</Row>
                <Row label="Renews">{p.subscription_rate.current_period_end ? day(p.subscription_rate.current_period_end * 1000) : "—"}</Row>
              </>}
            </dl>
            <Loadable s={billing} empty={!invoices.length}>
              <table className="w-full text-left">
                <caption className="sr-only">Invoices</caption>
                <thead className="border-b border-line text-[12px] text-graphite"><tr><th className="py-1.5 font-normal">Invoice</th><th className="py-1.5 font-normal">Status</th><th className="py-1.5 text-right font-normal">Amount</th><th className="py-1.5 text-right font-normal">Date</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {invoices.map(inv => (
                    <tr key={inv.id}><td className="figure-mono py-2">{inv.invoice_number || inv.number || `#${inv.id}`}</td><td className="py-2">{inv.status}</td><td className="figure-mono py-2 text-right">{money(inv.amount_pence)}</td><td className="figure-mono py-2 text-right">{day(inv.created_at)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Loadable>
          </>
        )}

        {tab === "history" && (
          <Loadable s={standing} empty={!s?.history?.length}>
            <ol className="divide-y divide-line">
              {(s?.history ?? []).map((h: any) => (
                <li key={h.id} className="py-2">
                  <p><span className="font-medium">{String(h.action).replace("account_", "").replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase())}</span><span className="text-graphite"> · {day(h.created_at)} · {h.admin_email ?? "system"}</span></p>
                  {h.details?.reason && <p className="text-graphite">{h.details.reason}</p>}
                </li>
              ))}
            </ol>
          </Loadable>
        )}
      </div>

      {dialog === "edit" && <EditDetails user={{ ...p, id }} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); setMsg({ ok: true, text: "Details saved." }); await Promise.all([profile.mutate(), onChanged()]); }} />}
      {dialog === "delete" && <DeletePermanently id={id} email={email} onClose={() => setDialog(null)} onDeleted={async () => { setDialog(null); await onChanged(); onBack(); }} />}
      <AccountStandingDialog user={dialog === "standing" ? { id, email } : null} onClose={() => setDialog(null)} onChanged={async () => { await Promise.all([onChanged(), standing.mutate()]); }} />
    </div>
  );
}

function EditDetails({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState({ email: user.email ?? "", first_name: user.first_name ?? "", last_name: user.last_name ?? "", company_name: user.company_name ?? "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => {
    const payload: Record<string, string> = {};
    for (const k of Object.keys(f) as (keyof typeof f)[]) if (f[k] !== (user[k] ?? "")) payload[k] = f[k];
    if (!Object.keys(payload).length) return onClose();
    setBusy(true); setErr("");
    try { await call(`/api/admin/users/${user.id}`, "PATCH", payload); await onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Edit details" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(); }}>
        {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
        <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name"><input className={inputCls} value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></Field>
        </div>
        <Field label="Company name"><input className={inputCls} value={f.company_name} onChange={e => setF({ ...f, company_name: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-1"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn type="submit" variant="solid" disabled={busy}>{busy ? "Saving…" : "Save"}</Btn></div>
      </form>
    </Modal>
  );
}

function DeletePermanently({ id, email, onClose, onDeleted }: { id: number | string; email: string; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [typed, setTyped] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr("");
    try { await call(`/api/admin/users/${id}?permanent=true`, "DELETE"); await onDeleted(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Delete permanently" onClose={onClose}>
      <p className="text-[13px] text-graphite">This removes the account and its data and cannot be undone. Accounts with records we must keep cannot be deleted; close them instead.</p>
      {err && <p role="alert" className="mt-2 text-[13px] text-destructive">{err}</p>}
      <Field label={`Type ${email} to confirm`}><input className={cn(inputCls, "mt-2")} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" /></Field>
      <div className="mt-3 flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" disabled={busy || typed.trim().toLowerCase() !== String(email).toLowerCase()} onClick={go}>{busy ? "Deleting…" : "Delete permanently"}</Btn></div>
    </Modal>
  );
}

function RestoreAccount({ row, onClose, onDone }: { row: any; onClose: () => void; onDone: (text: string) => Promise<void> }) {
  const [f, setF] = useState({ email: "", first_name: row.first_name ?? "", last_name: row.last_name ?? "", reactivate: true });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!f.email.includes("@")) { setErr("Enter the email address the account should use."); return; }
    setBusy(true); setErr("");
    try { await call(`/api/admin/users/${row.id}/restore`, "POST", f); await onDone(`Restored as ${f.email}.`); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Restore account" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void go(); }}>
        {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
        <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name"><input className={inputCls} value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.reactivate} onChange={e => setF({ ...f, reactivate: e.target.checked })} /> Reactivate the account</label>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn type="submit" variant="solid" disabled={busy}>{busy ? "Restoring…" : "Restore"}</Btn></div>
      </form>
    </Modal>
  );
}

function CreateAccount({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [type, setType] = useState<"customer" | "test" | "admin">("customer");
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", company_name: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState("");
  const go = async () => {
    if (!f.email.includes("@")) { setErr("Enter a valid email address."); return; }
    if (type === "test" && !f.password) { setErr("Choose a password for the test customer."); return; }
    if (type === "admin" && (!f.first_name.trim() || !f.last_name.trim())) { setErr("Enter the new admin's first and last name."); return; }
    setBusy(true); setErr("");
    try {
      const body = type === "admin" ? { account_type: "admin", email: f.email, first_name: f.first_name, last_name: f.last_name }
        : type === "test" ? { email: f.email, first_name: f.first_name, last_name: f.last_name, company_name: f.company_name, test_account: true, password: f.password }
        : { email: f.email, first_name: f.first_name, last_name: f.last_name, company_name: f.company_name };
      const j = await call("/api/admin/users", "POST", body);
      const newId = j?.data?.id;
      setDone(type === "admin" ? (j?.data?.email_sent === false ? `Admin #${newId} created, but the email could not be sent. Use Send password reset on their account.` : `Admin #${newId} created. ${f.email} has a link to choose a password (valid 72 hours).`)
        : type === "test" ? `Test customer #${newId} created. Sign in as ${f.email} with the password you chose. Name test scans user${newId}_DD-MM-YY_Type.pdf.`
        : `Customer #${newId} created. ${f.email} has been emailed a link to choose a password.`);
      setF(x => ({ ...x, password: "" }));
      await onCreated();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  if (done) return <Modal title="Account created" onClose={onClose}><p className="text-[13px]" role="status">{done}</p><div className="mt-3 flex justify-end"><Btn variant="solid" onClick={onClose}>Done</Btn></div></Modal>;
  return (
    <Modal title="Create account" onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void go(); }}>
        {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
        <fieldset className="grid grid-cols-3 gap-1 rounded-md bg-mist p-1 text-[13px]">
          <legend className="sr-only">Account type</legend>
          {([["customer", "Customer"], ["test", "Test customer"], ["admin", "Admin"]] as const).map(([v, l]) => (
            <label key={v} className={cn("cursor-pointer rounded px-2 py-1.5 text-center", type === v ? "bg-paper font-medium shadow-sm" : "text-graphite")}>
              <input type="radio" className="sr-only" name="account-type" checked={type === v} onChange={() => setType(v)} />{l}
            </label>
          ))}
        </fieldset>
        <p className="text-[12px] text-graphite">{type === "admin" ? "Full access to the admin area. They are emailed a link to choose a password." : type === "test" ? "Labelled as a test account. You choose the password; no email is sent." : "They are emailed a link to choose a password. Service starts once they pay at checkout."}</p>
        <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name"><input className={inputCls} value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></Field>
        </div>
        {type !== "admin" && <Field label="Company name (optional)"><input className={inputCls} value={f.company_name} onChange={e => setF({ ...f, company_name: e.target.value })} /></Field>}
        {type === "test" && <Field label="Password"><input className={inputCls} type="password" autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><span className="mt-1 block text-[12px] text-graphite">At least 8 characters, with upper and lower case letters and a number.</span></Field>}
        <div className="flex justify-end gap-2 pt-1"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn type="submit" variant="solid" disabled={busy}>{busy ? "Creating…" : "Create"}</Btn></div>
      </form>
    </Modal>
  );
}
