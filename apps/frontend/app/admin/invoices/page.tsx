"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AdminInvoiceRow = {
  id: number;
  user_id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  invoice_number?: string | null;
  amount_pence: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string | number;
  pdf_path?: string | null;
};

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

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Primary workflow: search/select a user, then list their invoices
  const [userQuery, setUserQuery] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; email: string } | null>(null);

  // Optional advanced filters
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [items, setItems] = useState<AdminInvoiceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState<number | null>(null);

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

  const moneyFmt = useMemo(
    () => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
    []
  );

  async function loadInvoices(nextPage = page) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(nextPage));
      qs.set("page_size", String(pageSize));
      if (selectedUser?.email) qs.set("email", selectedUser.email);
      if (selectedUser?.id) qs.set("user_id", String(selectedUser.id));
      if (invoiceNumber.trim()) qs.set("invoice_number", invoiceNumber.trim());
      if (from.trim()) qs.set("from", from.trim());
      if (to.trim()) qs.set("to", to.trim());

      const r = await fetch(`/api/bff/admin/invoices?${qs.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || `Request failed (${r.status})`);
      }
      setItems((data.data?.items ?? []) as AdminInvoiceRow[]);
      setTotal(typeof data.data?.total === "number" ? data.data.total : null);
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message || "Failed to load invoices");
      setItems([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf(inv: AdminInvoiceRow) {
    if (!token) return;
    setError(null);
    try {
      const url = `/api/bff/admin/invoices/${inv.id}/download?disposition=attachment`;
      const r = await fetch(url, {
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
      a.download = `${inv.invoice_number || `invoice-${inv.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to download PDF");
    }
  }

  useEffect(() => {
    if (!loadingAuth && token) {
      loadInvoices(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, token]);

  // Fetch user suggestions (admin user search)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) return;
      const q = userQuery.trim();
      if (!q) {
        setUserSuggestions([]);
        return;
      }

      try {
        const r = await fetch(`/api/bff/admin/users/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          credentials: "include",
        });
        const data = await r.json().catch(() => null);
        if (cancelled) return;
        if (r.ok && data?.ok && Array.isArray(data?.data)) {
          setUserSuggestions(data.data);
        } else {
          setUserSuggestions([]);
        }
      } catch {
        if (!cancelled) setUserSuggestions([]);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [token, userQuery]);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Search invoices across all customers</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
            Back to admin
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">User (email or ID)</div>
                <Input
                  value={userQuery}
                  onChange={(e) => {
                    setUserQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  placeholder="Search a user…"
                />
                {selectedUser ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selected: <span className="font-medium">{selectedUser.email}</span> (ID {selectedUser.id})
                  </div>
                ) : null}
                {!selectedUser && userSuggestions.length > 0 ? (
                  <div className="mt-2 border rounded-md bg-background max-h-52 overflow-auto">
                    {userSuggestions.slice(0, 10).map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setSelectedUser({ id: Number(u.id), email: String(u.email || "") });
                          setUserQuery(String(u.email || u.id));
                          setUserSuggestions([]);
                          loadInvoices(1);
                        }}
                      >
                        <div className="font-medium">{u.email || "—"}</div>
                        <div className="text-xs text-muted-foreground">User {u.id}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Invoice number</div>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="VAH-2025-000001" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">From (YYYY-MM-DD)</div>
                <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-01-01" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">To (YYYY-MM-DD)</div>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2025-12-31" />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => loadInvoices(1)} disabled={loading}>
                  {loading ? "Searching…" : "Search"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUserQuery("");
                    setUserSuggestions([]);
                    setSelectedUser(null);
                    setInvoiceNumber("");
                    setFrom("");
                    setTo("");
                    loadInvoices(1);
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Results{total != null ? ` (${total})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading…" : "No invoices found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((inv) => {
                    const created = parseDateMaybe(inv.created_at);
                    const createdLabel = created ? created.toLocaleString("en-GB") : "—";
                    const amount = moneyFmt.format((Number(inv.amount_pence || 0) / 100) || 0);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.invoice_number || `Invoice #${inv.id}`}
                          <div className="text-xs text-muted-foreground">ID: {inv.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{inv.email}</div>
                          <div className="text-xs text-muted-foreground">User {inv.user_id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{amount}</TableCell>
                        <TableCell>
                          <div className="text-sm">{inv.period_start} → {inv.period_end}</div>
                        </TableCell>
                        <TableCell>{createdLabel}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/invoices/${inv.id}`)}>
                            View
                          </Button>
                          <Button size="sm" onClick={() => downloadPdf(inv)}>
                            Download PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => loadInvoices(page - 1)} disabled={loading || page <= 1}>
                  Prev
                </Button>
                <Button variant="outline" onClick={() => loadInvoices(page + 1)} disabled={loading || (total != null && page * pageSize >= total)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


