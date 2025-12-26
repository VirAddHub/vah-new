"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminHeader } from "@/components/admin/parts/AdminHeader";
import { Users, Truck, FileText, Settings, Package } from "lucide-react";

function parseDateMaybe(v: unknown): Date | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function AdminInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const moneyFmt = useMemo(
    () => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
    []
  );

  useEffect(() => {
    const t = localStorage.getItem("vah_jwt");
    const storedUser = localStorage.getItem("vah_user");

    if (!t) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (!u.is_admin && u.role !== "admin") {
          router.push("/dashboard");
          return;
        }
        setUser(u);
      } catch {
        router.push("/login");
        return;
      }
    }

    setToken(t);
    setLoadingAuth(false);
  }, [router]);

  async function load() {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/bff/admin/invoices/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || data?.message || `Request failed (${r.status})`);
      setInvoice(data.data?.invoice ?? null);
      setItems(data.data?.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!token || !id) return;
    setError(null);
    try {
      const r = await fetch(`/api/bff/admin/invoices/${encodeURIComponent(id)}/download?disposition=attachment`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `Download failed (${r.status})`);
      }
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${invoice?.invoice_number || `invoice-${id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(objectUrl);
      // Safely remove the element if it's still a child
      if (a.parentNode === document.body) {
        document.body.removeChild(a);
      } else if (a.remove) {
        // Fallback to modern API if parentNode check fails
        a.remove();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to download PDF");
    }
  }

  useEffect(() => {
    if (!loadingAuth && token && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, token, id]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const created = parseDateMaybe(invoice?.created_at);
  const createdLabel = created ? created.toLocaleString("en-GB") : "—";
  const amountLabel = moneyFmt.format((Number(invoice?.amount_pence || 0) / 100) || 0);

  const handleLogout = () => {
    localStorage.removeItem('vah_jwt');
    localStorage.removeItem('vah_user');
    document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      router.push('/');
    } else {
      router.push(`/${page}`);
    }
  };

  const menuItems = [
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
    { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
    { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ] as const;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        onNavigate={handleNavigate}
        menuItems={menuItems}
        activeSection=""
        onSelectSection={(section) => {
          if (section === 'users') router.push('/admin/dashboard?section=users');
          else if (section === 'forwarding') router.push('/admin/dashboard?section=forwarding');
          else if (section === 'plans') router.push('/admin/dashboard?section=plans');
          else if (section === 'blog') router.push('/admin/dashboard?section=blog');
          else if (section === 'settings') router.push('/admin/dashboard?section=settings');
          else router.push('/admin/dashboard');
        }}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogout={handleLogout}
        onGoInvoices={() => router.push('/admin/invoices')}
        onGoFilenameGenerator={() => router.push('/admin/filename-generator')}
        activePage="invoices"
      />

      <main id="main-content" role="main" className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{invoice?.invoice_number || `Invoice #${id}`}</h1>
              <p className="text-muted-foreground">Invoice details and line items</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/invoices")}>
                Back
              </Button>
              <Button onClick={downloadPdf} disabled={loading}>
                Download PDF
              </Button>
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{invoice?.email || "—"}</div>
                <div className="text-xs text-muted-foreground">User {invoice?.user_id ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={invoice?.status === "paid" ? "default" : "secondary"}>{invoice?.status || "—"}</Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-medium">{amountLabel}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Billing period</div>
                <div className="font-medium">
                  {invoice?.period_start || "—"} → {invoice?.period_end || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-medium">{createdLabel}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Invoice ID</div>
                <div className="font-medium">{invoice?.id ?? id}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No billable activity this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it, idx) => (
                      <TableRow key={`${it.service_date}-${idx}`}>
                        <TableCell>{it.service_date || "—"}</TableCell>
                        <TableCell>{it.description || "—"}</TableCell>
                        <TableCell className="text-right">{moneyFmt.format((Number(it.amount_pence || 0) / 100) || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


