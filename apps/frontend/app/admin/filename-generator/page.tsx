"use client";

// Force dynamic rendering - requires authentication
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Search, Clipboard, ClipboardCheck, Users, Truck, FileText, Package, AlertTriangle, Minus, Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/parts/AdminHeader";
import { useVerifiedAdminSession } from "@/hooks/useVerifiedAdminSession";
import { buildAdminBffHeaders } from "@/lib/verifiedAdminSession";
import { MailImporterStatus } from "@/components/admin/MailImporterStatus";

type AdminUserHit = {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  is_suspended?: boolean | null;
};

type SearchResponse =
  | { ok: true; data: AdminUserHit[] }
  | { ok: false; error?: string; message?: string };

/** Letter types. `code` goes in the filename; HMRC and Companies House are forwarded free. */
const LETTER_TYPES = [
  { code: "HMRC", label: "HMRC" },
  { code: "CompaniesHouse", label: "Companies House" },
  { code: "Bank", label: "Bank" },
  { code: "Insurance", label: "Insurance" },
  { code: "Utilities", label: "Utilities" },
  { code: "Other", label: "Anything else" },
] as const;

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** 2026-11-20 -> 20-11-26, the date format the importer reads. */
const toFilenameDate = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1].slice(-2)}` : "";
};

const displayName = (u: AdminUserHit) =>
  u.company_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;

export default function FilenameGeneratorPage() {
  const router = useRouter();
  const { status: adminStatus } = useVerifiedAdminSession();

  useEffect(() => {
    if (adminStatus === "unauthenticated") router.replace("/admin/login");
    else if (adminStatus === "forbidden") router.replace("/admin/login");
  }, [adminStatus, router]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminUserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserHit | null>(null);
  const [tag, setTag] = useState<string>("");
  const [dateIso, setDateIso] = useState(isoToday());
  const [letterNumber, setLetterNumber] = useState(1);
  const [copied, setCopied] = useState(false);
  /** How many names were copied this session per customer + date + type, so the next one is numbered. */
  const [copiedCounts, setCopiedCounts] = useState<Record<string, number>>({});

  const countKey = selectedUser && tag ? `${selectedUser.id}|${dateIso}|${tag}` : "";

  // When the customer, date or type changes, suggest the next number not yet used this session
  useEffect(() => {
    setLetterNumber(countKey && copiedCounts[countKey] ? copiedCounts[countKey] + 1 : 1);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countKey]);

  /** Same customer, type and day: move on to the next number. */
  const nextLetter = () => {
    setLetterNumber((n) => Math.max(n + 1, (countKey && copiedCounts[countKey] ? copiedCounts[countKey] + 1 : 1)));
    setCopied(false);
  };

  const filenameDate = toFilenameDate(dateIso);

  const generatedFilename = useMemo(() => {
    if (!selectedUser || !filenameDate || !tag) return "";
    const suffix = letterNumber > 1 ? `_${letterNumber}` : "";
    return `user${selectedUser.id}_${filenameDate}_${tag}${suffix}.pdf`;
  }, [selectedUser, filenameDate, tag, letterNumber]);

  const runSearch = async (text: string) => {
    const q = text.trim();
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/bff/admin/users/search?q=${encodeURIComponent(q)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: buildAdminBffHeaders(),
        }
      );

      const json: SearchResponse = await res.json();

      if (!res.ok || json.ok === false) {
        setError("Search didn't work. Try again, or sign in again if it keeps failing.");
        return;
      }

      const data = json.data ?? [];
      setResults(data);
      if (data.length === 1) setSelectedUser(data[0]);
      if (data.length === 0) setError("No customer matches that. Try their number, email, name or company.");
    } catch (err) {
      console.error("[filename-generator] search error", err);
      setError("Something went wrong while searching.");
    } finally {
      setLoading(false);
    }
  };

  // Search as you type (after a short pause)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const timer = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleCopy = async () => {
    if (!generatedFilename) return;
    try {
      await navigator.clipboard.writeText(generatedFilename);
    } catch {
      setError("Your browser blocked copying. Select the name and copy it by hand.");
      return;
    }
    setCopied(true);
    if (countKey) {
      setCopiedCounts((prev) => ({ ...prev, [countKey]: Math.max(prev[countKey] || 0, letterNumber) }));
    }
  };

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if ((handleLogout as any).__isLoggingOut) {
      return;
    }
    (handleLogout as any).__isLoggingOut = true;

    try {
      await fetch('/api/bff/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Removed
      // Removed
      const isSecure = window.location.protocol === 'https:';
      const sameSiteValue = isSecure ? 'None' : 'Lax';
      const secureFlag = isSecure ? '; Secure' : '';
      document.cookie = `vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
      document.cookie = `vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
      document.cookie = `vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
      document.cookie = `vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
      document.cookie = `vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
      window.stop();
      setTimeout(() => {
        window.location.replace('/admin/login');
      }, 200);
    }
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
    { id: "mail", label: "Mail", icon: <FileText className="h-4 w-4" /> },
    { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
    { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
    { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" /> },
  ] as const;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (adminStatus === "loading" || adminStatus === "unauthenticated" || adminStatus === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground text-sm">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        onNavigate={handleNavigate}
        menuItems={menuItems}
        activeSection=""
        onSelectSection={(section) => {
          if (section === 'users') router.push('/admin/dashboard?section=users');
          else if (section === 'mail') router.push('/admin/dashboard?section=mail');
          else if (section === 'forwarding') router.push('/admin/dashboard?section=forwarding');
          else if (section === 'plans') router.push('/admin/dashboard?section=plans');
          else if (section === 'blog') router.push('/admin/dashboard?section=blog');
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
      <main id="main-content" role="main" className="flex flex-col gap-8 px-4 py-8 sm:px-6 lg:ml-56 lg:px-8"><div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-h2 font-semibold">Name a scan</h1>
          <p className="text-body-sm text-muted-foreground">
            Every scan saved in the OneDrive mail inbox needs a name that says whose letter it is. Pick the customer
            and the type of letter, copy the name, and save the scan with it. It appears on the customer&apos;s
            account within about 5 minutes.
          </p>
        </header>

        <MailImporterStatus compact />

        {/* Step 1 */}
        <section className="space-y-3" aria-labelledby="step-customer">
          <h2 id="step-customer" className="text-body-lg font-medium">1. Who is the letter for?</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              id="search"
              className="pl-10"
              placeholder="Customer number, name, company or email (as printed on the envelope)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              aria-label="Find the customer"
              autoFocus
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
          </div>
          {error && <p className="text-body-sm text-destructive">{error}</p>}

          {results.length > 0 && (
            <div className="divide-y rounded-lg border bg-card" role="listbox" aria-label="Matching customers">
              {results.map((user) => {
                const isActive = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-mist",
                      isActive && "bg-mist"
                    )}
                    onClick={() => setSelectedUser(user)}
                  >
                    <span className="min-w-0">
                      <span className="block text-body-sm font-medium truncate">{displayName(user)}</span>
                      <span className="block text-caption text-muted-foreground truncate">
                        #{user.id} · {[user.first_name, user.last_name].filter(Boolean).join(" ")}{user.company_name ? " · " : ""}{user.email}
                      </span>
                    </span>
                    {isActive && <span className="text-caption font-medium text-ink shrink-0">Selected</span>}
                  </button>
                );
              })}
            </div>
          )}

          {selectedUser?.is_suspended && (
            <p className="flex items-start gap-2 text-body-sm text-ink rounded-lg border border-line bg-mist px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
              This account is suspended. Scan and name the letter as normal: it will be held on their account, but they
              can&apos;t open it until the account is restored.
            </p>
          )}
        </section>

        {selectedUser && (
          <>
            {/* Step 2 */}
            <section className="space-y-3" aria-labelledby="step-type">
              <h2 id="step-type" className="text-body-lg font-medium">2. What kind of letter is it?</h2>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of letter">
                {LETTER_TYPES.map((t) => (
                  <button
                    key={t.code}
                    role="radio"
                    aria-checked={tag === t.code}
                    onClick={() => setTag(t.code)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-body-sm font-medium transition",
                      tag === t.code ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:bg-mist"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-caption text-muted-foreground">
                HMRC and Companies House letters are forwarded free; other letters have a forwarding fee.
              </p>
            </section>

            {/* Step 3 */}
            <section className="grid gap-4 sm:grid-cols-2" aria-label="Date and letter number">
              <div className="space-y-2">
                <Label htmlFor="date">3. Date it arrived</Label>
                <Input id="date" type="date" value={dateIso} max={isoToday()} onChange={(e) => setDateIso(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letter-number">Letter number (same customer, type and day)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setLetterNumber((n) => Math.max(1, n - 1)); setCopied(false); }} aria-label="One less">
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                  <span id="letter-number" className="w-10 text-center font-medium" aria-live="polite">{letterNumber}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setLetterNumber((n) => Math.min(50, n + 1)); setCopied(false); }} aria-label="One more">
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <p className="text-caption text-muted-foreground">
                  Use 2, 3… for a second or third letter of the same type for the same customer on the same day, so no two scans share a name.
                </p>
              </div>
            </section>

            {/* Step 4 */}
            <section className="space-y-3 rounded-xl border bg-card p-5" aria-labelledby="step-copy">
              <h2 id="step-copy" className="text-body-lg font-medium">4. Copy the name and save the scan with it</h2>
              {generatedFilename ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="flex-1 rounded-lg bg-mist px-3 py-2 text-body break-all">{generatedFilename}</code>
                    <Button type="button" className="sm:w-36" onClick={handleCopy}>
                      {copied ? (
                        <><ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />Copied</>
                      ) : (
                        <><Clipboard className="mr-2 h-4 w-4" aria-hidden />Copy name</>
                      )}
                    </Button>
                  </div>
                  {copied ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
                      <p className="text-body-sm text-muted-foreground">
                        Copied. Now save the scan into the OneDrive mail inbox with this name.
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={nextLetter}>
                        Another {LETTER_TYPES.find((t) => t.code === tag)?.label} letter for this customer
                      </Button>
                    </div>
                  ) : (
                    <p className="text-body-sm text-muted-foreground">
                      For {displayName(selectedUser)} (#{selectedUser.id}).
                    </p>
                  )}
                </>
              ) : (
                <p className="text-body-sm text-muted-foreground">Choose the type of letter to see the name.</p>
              )}
            </section>
          </>
        )}
      </div>
      </main>
    </div>
  );
}
