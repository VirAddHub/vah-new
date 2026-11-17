"use client";

import Link from "next/link";
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
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3 [&_img]:invert">
          <VAHLogo onNavigate={onNavigate} size="sm" />
          <span className="rounded-full border border-paper/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-paper/80">Admin</span>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex [scrollbar-width:none]" aria-label="Admin">
          {ADMIN_SECTIONS.map(i => sectionItem(i))}
          <span className="mx-1 h-5 w-px shrink-0 bg-paper/20" aria-hidden />
          {tools()}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={cn(itemClass(false), "lg:hidden")} aria-expanded={mobileMenuOpen} aria-controls="admin-mobile-nav"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            <span>Menu</span>
          </button>
          <button type="button" onClick={onLogout} className={itemClass(false)}>
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav id="admin-mobile-nav" aria-label="Admin" className="grid grid-cols-1 gap-1 border-t border-paper/15 p-3 sm:grid-cols-2 lg:hidden">
          {ADMIN_SECTIONS.map(i => sectionItem(i, true))}
          {tools(true)}
        </nav>
      )}
    </header>
  );
}
