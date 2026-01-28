"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Search, Clipboard, ClipboardCheck, Users, Truck, FileText, Settings, Package } from "lucide-react";
import { AdminHeader } from "@/components/admin/parts/AdminHeader";

type AdminUserHit = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  plan_status?: string | null;
  kyc_status?: string | null;
  status?: string | null;
};

type SearchResponse =
  | { ok: true; data: AdminUserHit[] }
  | { ok: false; error?: string; message?: string };

const PLAN_STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending_payment: "bg-amber-50 text-amber-800 border border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
  trialing: "bg-sky-50 text-sky-700 border border-sky-200",
};

const KYC_CLASSES: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-200",
  rejected: "bg-rose-50 text-rose-700 border border-rose-200",
};

const todayString = () => {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

export default function FilenameGeneratorPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminUserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserHit | null>(null);
  const [tag, setTag] = useState("");
  const [date, setDate] = useState(todayString());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDate(todayString());
    setTag("");
  }, [selectedUser?.id]);

  const sanitizedTag = useMemo(() => {
    return tag.trim().replace(/\s+/g, "");
  }, [tag]);

  const generatedFilename = useMemo(() => {
    if (!selectedUser || !date.trim() || !sanitizedTag) return "";
    return `user${selectedUser.id}_${date}_${sanitizedTag}.pdf`;
  }, [selectedUser, date, sanitizedTag]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Enter a name, company or email");
      setResults([]);
      setSelectedUser(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedUser(null);

    try {
      const res = await fetch(
        `/api/bff/admin/users/search?q=${encodeURIComponent(query.trim())}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const json: SearchResponse = await res.json();

      if (!res.ok || json.ok === false) {
        const message =
          json.ok === false
            ? json.error || json.message || "Search failed"
            : "Search failed";
        setError(message);
        return;
      }

      const data = json.data ?? [];
      setResults(data);

      if (data.length === 1) {
        setSelectedUser(data[0]);
      }

      if (data.length === 0) {
        setError("No users found for that search.");
      }
    } catch (err) {
      console.error("[filename-generator] search error", err);
      setError("Something went wrong while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedFilename) return;
    await navigator.clipboard.writeText(generatedFilename);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

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
        activePage="filename-generator"
      />

      {/* Main Content */}
      <main id="main-content" role="main" className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Mail filename generator</h1>
          <p className="text-sm text-muted-foreground">
            Generate the exact filename format we require before uploading scans.
          </p>
          <p className="text-xs text-muted-foreground font-mono bg-muted/60 inline-block px-2 py-1 rounded">
            user&#123;ID&#125;_&#123;DD-MM-YY&#125;_&#123;TAG&#125;.pdf
          </p>
        </header>

        <section className="space-y-3">
          <Label htmlFor="search">Search user</Label>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              id="search"
              placeholder="Search by name, company, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              className="md:w-40"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {results.length > 0 && (
            <div className="divide-y rounded-lg border bg-card shadow-sm">
              {results.map((user) => {
                const isActive = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-accent",
                      isActive && "bg-accent/60"
                    )}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span className="text-sm font-medium">
                      {user.company_name ||
                        [user.first_name, user.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                        user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID {user.id} • {user.email}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedUser && (
          <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium">Selected user</h2>
              <p className="text-sm text-muted-foreground font-mono">
                user#{selectedUser.id}
              </p>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Name</p>
                <p>
                  {[selectedUser.first_name, selectedUser.last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Email</p>
                <p className="font-mono text-xs">{selectedUser.email}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Company</p>
                <p>{selectedUser.company_name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Account status</p>
                <p>{selectedUser.status || "unknown"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge
                variant="outline"
                className={
                  PLAN_STATUS_CLASSES[selectedUser.plan_status ?? ""] ??
                  "bg-slate-100 text-slate-700 border border-slate-200"
                }
              >
                Plan: {selectedUser.plan_status ?? "unknown"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  KYC_CLASSES[selectedUser.kyc_status ?? ""] ??
                  "bg-slate-100 text-slate-700 border border-slate-200"
                }
              >
                KYC: {selectedUser.kyc_status ?? "pending"}
              </Badge>
              {selectedUser.status && (
                <Badge variant="outline">Status: {selectedUser.status}</Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date segment (DD-MM-YY)</Label>
                <Input
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. 27-11-25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag">Mail tag</Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="HMRC, CompaniesHouse, Bank…"
                />
                <p className="text-xs text-muted-foreground">
                  Spaces will be removed automatically.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Generated filename</Label>
              {generatedFilename ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm">
                    {generatedFilename}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    className="sm:w-32"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Clipboard className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enter both a date and a tag to see the filename.
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

