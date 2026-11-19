"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ReactNode } from "react";
import { VAHLogo } from "@/components/VAHLogo";
import { ClipboardList, Clipboard, FileText, LogOut, Mail, Menu, Package, Receipt, ShieldCheck, Truck, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = { id: string; label: string; icon: ReactNode };

/** The one list of admin sections, so every admin page shows the same navigation. */
export const ADMIN_SECTIONS: readonly MenuItem[] = [
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" aria-hidden /> },
  { id: "mail", label: "Mail", icon: <Mail className="h-4 w-4" aria-hidden /> },
  { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" aria-hidden /> },
  { id: "companies-house", label: "Companies House", icon: <ShieldCheck className="h-4 w-4" aria-hidden /> },
  { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" aria-hidden /> },
  { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" aria-hidden /> },
  { id: "audit", label: "Audit log", icon: <ClipboardList className="h-4 w-4" aria-hidden /> },
];

interface AdminHeaderProps {
  onNavigate?: (page: string, data?: any) => void;
  /** Kept for compatibility; the header always shows ADMIN_SECTIONS. */
  menuItems?: readonly MenuItem[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
  onGoInvoices: () => void;
  onGoFilenameGenerator: () => void;
  activePage?: 'invoices' | 'filename-generator' | null;
}

const itemClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors duration-150 lg:[&_svg]:hidden 2xl:[&_svg]:inline",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
    active ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/10 hover:text-paper",
  );

/** Black bar: tells admins at a glance they are not in the customer app. */
export function AdminHeader({
  onNavigate,
  activeSection,
  onSelectSection,
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout,
  onGoInvoices,
  onGoFilenameGenerator,
  activePage,
}: AdminHeaderProps) {
  const onDashboard = !activePage;

  const sectionItem = (item: MenuItem, mobile = false) => {
    const active = onDashboard && activeSection === item.id;
    const cls = cn(itemClass(active), mobile && "w-full justify-start");
    return onDashboard ? (
      <button key={item.id} type="button" className={cls} aria-current={active ? "page" : undefined}
        onClick={() => { onSelectSection(item.id); setMobileMenuOpen(false); }}>
        {item.icon}{item.label}
      </button>
    ) : (
      <Link key={item.id} href={`/admin/dashboard?section=${item.id}`} className={cls}>{item.icon}{item.label}</Link>
    );
  };
  const tools = (mobile = false) => (
    <>
      <button type="button" className={cn(itemClass(activePage === "invoices"), mobile && "w-full justify-start")}
        aria-current={activePage === "invoices" ? "page" : undefined} onClick={() => { onGoInvoices(); setMobileMenuOpen(false); }}>
        <Receipt className="h-4 w-4" aria-hidden />Invoices
      </button>
      <button type="button" className={cn(itemClass(activePage === "filename-generator"), mobile && "w-full justify-start")}
        aria-current={activePage === "filename-generator" ? "page" : undefined} onClick={() => { onGoFilenameGenerator(); setMobileMenuOpen(false); }}>
        <Clipboard className="h-4 w-4" aria-hidden />Filenames
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 [&_img]:invert [&_img]:max-w-[150px] sm:[&_img]:max-w-none">
          <VAHLogo onNavigate={onNavigate} size="sm" />
          <span className="rounded-full border border-paper/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-paper/80">Admin</span>
        </div>


        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className={cn(itemClass(false), "lg:hidden")} aria-expanded={mobileMenuOpen} aria-controls="admin-mobile-nav"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            <span className="sr-only sm:not-sr-only">Menu</span>
          </button>
          <button type="button" onClick={onLogout} className={itemClass(false)}>
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </div>

      <AdminSidebar activeSection={onDashboard ? activeSection : null} activePage={activePage ?? null}
        onSelectSection={onDashboard ? (id) => onSelectSection(id) : null}
        onGoInvoices={onGoInvoices} onGoFilenameGenerator={onGoFilenameGenerator} />

      {mobileMenuOpen && (
        <nav id="admin-mobile-nav" aria-label="Admin" className="grid grid-cols-1 gap-1 border-t border-paper/15 p-3 sm:grid-cols-2 lg:hidden">
          {ADMIN_SECTIONS.map(i => sectionItem(i, true))}
          {tools(true)}
        </nav>
      )}
    </header>
  );
}

const fetchJson = (url: string) => fetch(url, { credentials: "include", cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null);

/** Items waiting for an administrator, shown as counts beside the section names. */
function useActionCounts() {
  const { data: fwd } = useSWR("/api/bff/admin/forwarding/stats?days=3650", fetchJson, { refreshInterval: 120_000 });
  const { data: ch } = useSWR(["/api/admin/ch-verification/submissions", "submitted"], () => fetchJson("/api/admin/ch-verification/submissions?status=submitted"), { refreshInterval: 120_000 });
  const c = fwd?.counts ?? {};
  const forwarding = (c.requested ?? 0) + (c.reviewed ?? 0) + (c.processing ?? 0);
  const chItems = Array.isArray(ch?.data) ? ch.data.length : Array.isArray(ch?.data?.items) ? ch.data.items.length : 0;
  return { forwarding, "companies-house": chItems } as Record<string, number>;
}

/** Left navigation on large screens (white, black active marker), as on the customer dashboard. */
function AdminSidebar({ activeSection, activePage, onSelectSection, onGoInvoices, onGoFilenameGenerator }: {
  activeSection: string | null;
  activePage: "invoices" | "filename-generator" | null;
  onSelectSection: ((id: string) => void) | null;
  onGoInvoices: () => void;
  onGoFilenameGenerator: () => void;
}) {
  const counts = useActionCounts();
  const row = (active: boolean) => cn(
    "flex h-10 w-full items-center gap-3 border-l-2 px-4 text-[14px] transition-colors duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
    active ? "border-l-ink bg-mist font-medium text-ink" : "border-l-transparent text-graphite hover:bg-mist hover:text-ink",
  );
  const badge = (n?: number) => (n ? <span className="ml-auto rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper" aria-label={`${n} waiting`}>{n}</span> : null);
  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-56 overflow-y-auto border-r border-line bg-paper py-4 text-ink lg:block" aria-label="Admin sections">
      <ul className="space-y-0.5">
        {ADMIN_SECTIONS.map(item => {
          const active = activeSection === item.id;
          return (
            <li key={item.id}>
              {onSelectSection ? (
                <button type="button" className={row(active)} aria-current={active ? "page" : undefined} onClick={() => onSelectSection(item.id)}>
                  {item.icon}{item.label}{badge(counts[item.id])}
                </button>
              ) : (
                <Link href={`/admin/dashboard?section=${item.id}`} className={row(false)}>{item.icon}{item.label}{badge(counts[item.id])}</Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Tools</p>
      <ul className="mt-2 space-y-0.5">
        <li><button type="button" className={row(activePage === "invoices")} aria-current={activePage === "invoices" ? "page" : undefined} onClick={onGoInvoices}><Receipt className="h-4 w-4" aria-hidden />Invoices</button></li>
        <li><button type="button" className={row(activePage === "filename-generator")} aria-current={activePage === "filename-generator" ? "page" : undefined} onClick={onGoFilenameGenerator}><Clipboard className="h-4 w-4" aria-hidden />Filenames</button></li>
      </ul>
    </aside>
  );
}
