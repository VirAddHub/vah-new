"use client";

// Force dynamic rendering - requires authentication
export const dynamic = 'force-dynamic';

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
  cancelled: "bg-red-50 text-red-700 border border-red-200",
  expired: "bg-gray-50 text-gray-700 border border-gray-200",
};

const KYC_STATUS_CLASSES: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  "not_started": "bg-gray-50 text-gray-700 border border-gray-200",
};

export default function FilenameGeneratorPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUserHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('vah_jwt');
    const storedUser = localStorage.getItem('vah_user');

    if (!token || !storedUser) {
      router.push('/admin/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      if (!userData.is_admin && userData.role !== 'admin') {
        router.push('/admin/login');
        return;
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
      router.push('/admin/login');
      return;
    }
  }, [router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const data: SearchResponse = await response.json();

      if (data.ok && data.data) {
        setSearchResults(data.data);
      } else {
        setError(data.error || data.message || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      console.error("[filename-generator] search error", err);
      setError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopy = async (userId: number) => {
    try {
      await navigator.clipboard.writeText(String(userId));
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateFilename = (user: AdminUserHit): string => {
    const parts: string[] = [];

    if (user.company_name) {
      parts.push(user.company_name.replace(/[^a-zA-Z0-9]/g, '_'));
    }

    if (user.first_name && user.last_name) {
      parts.push(`${user.first_name}_${user.last_name}`.replace(/[^a-zA-Z0-9]/g, '_'));
    } else if (user.email) {
      const emailPart = user.email.split('@')[0];
      parts.push(emailPart.replace(/[^a-zA-Z0-9]/g, '_'));
    }

    parts.push(String(user.id));

    return parts.join('_').toLowerCase();
  };

  const menuItems = [
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { id: "mail", label: "Mail", icon: <FileText className="h-4 w-4" /> },
    { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
    { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
    { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        onNavigate={(page: string) => {
          if (page === 'dashboard') {
            router.push('/admin/dashboard');
          } else {
            router.push(`/${page}`);
          }
        }}
        menuItems={menuItems}
        activeSection=""
        onSelectSection={(section) => {
          router.push(`/admin/dashboard?section=${section}`);
        }}
        mobileMenuOpen={false}
        setMobileMenuOpen={() => {}}
        onLogout={() => {
          localStorage.removeItem('vah_jwt');
          localStorage.removeItem('vah_user');
          router.push('/admin/login');
        }}
        onGoInvoices={() => router.push('/admin/invoices')}
        onGoFilenameGenerator={() => router.push('/admin/filename-generator')}
        activePage="filename-generator"
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Filename Generator</h1>
            <p className="text-muted-foreground mt-2">
              Search for users and generate standardized filenames
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by email, name, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Results ({searchResults.length})</h2>
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const filename = generateFilename(user);
                    return (
                      <div
                        key={user.id}
                        className="border rounded-lg p-4 space-y-2 bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{user.email}</span>
                              {user.plan_status && (
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    PLAN_STATUS_CLASSES[user.plan_status] ||
                                      "bg-gray-50 text-gray-700 border border-gray-200"
                                  )}
                                >
                                  {user.plan_status}
                                </Badge>
                              )}
                              {user.kyc_status && (
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    KYC_STATUS_CLASSES[user.kyc_status] ||
                                      "bg-gray-50 text-gray-700 border border-gray-200"
                                  )}
                                >
                                  {user.kyc_status}
                                </Badge>
                              )}
                            </div>
                            {user.company_name && (
                              <p className="text-sm text-muted-foreground">
                                {user.company_name}
                              </p>
                            )}
                            {(user.first_name || user.last_name) && (
                              <p className="text-sm text-muted-foreground">
                                {user.first_name} {user.last_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              User ID: {user.id}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-2 mt-2">
                          <Label className="text-sm font-medium mb-1 block">
                            Generated Filename
                          </Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                              {filename}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(user.id)}
                              className="shrink-0"
                            >
                              {copiedId === user.id ? (
                                <>
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="h-4 w-4 mr-2" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && !error && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
