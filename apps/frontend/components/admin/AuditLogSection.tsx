"use client";

import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";

type AuditEntry = {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  create_user: "User created",
  update_user: "User updated",
  delete_user: "User deleted",
  restore_user: "User restored",
  send_password_reset: "Password reset sent",
  kyc_update: "KYC updated",
  plan_update: "Plan updated",
  forwarding_status_update: "Forwarding updated",
  mail_destroyed: "Mail destroyed",
  admin_login: "Admin login",
  user_login_attempt: "Login attempt",
  user_login_success: "Login success",
  user_login_failed: "Login failed",
  user_logout: "Logout",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create_user: "default",
  delete_user: "destructive",
  restore_user: "secondary",
  send_password_reset: "outline",
  user_login_failed: "destructive",
  mail_destroyed: "destructive",
};

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(raw: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return "";
  const SKIP = new Set(["password", "password_hash", "token", "secret"]);
  const parts = Object.entries(details)
    .filter(([k]) => !SKIP.has(k))
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .slice(0, 4);
  return parts.join(" · ");
}

const PAGE_SIZE = 25;

export function AuditLogSection() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"admin" | "auth">("admin");

  const load = useCallback(async (tab: "admin" | "auth", off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (tab === "auth") params.set("type", "auth");
      const res = await fetch(`/api/admin-audit?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEntries(json.items ?? []);
      setTotal(json.total ?? 0);
      setLoaded(true);
    } catch (e: any) {
      toast({ title: "Failed to load audit log", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleTabChange = (tab: "admin" | "auth") => {
    setActiveTab(tab);
    setOffset(0);
    load(tab, 0);
  };

  const handlePage = (newOffset: number) => {
    setOffset(newOffset);
    load(activeTab, newOffset);
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h4 font-semibold">Audit log</h2>
          <p className="text-body-sm text-muted-foreground">
            Every admin action recorded for accountability.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(activeTab, offset)} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["admin", "auth"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-body-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "admin" ? "Admin actions" : "Auth events"}
          </button>
        ))}
      </div>

      {/* Load prompt */}
      {!loaded && !loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <p className="text-body-sm">Click load to fetch the audit log.</p>
          <Button variant="outline" onClick={() => load(activeTab, 0)}>
            Load audit log
          </Button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-body-sm text-muted-foreground">Loading…</div>
      )}

      {loaded && !loading && entries.length === 0 && (
        <div className="text-center py-12 text-body-sm text-muted-foreground">
          No audit entries found.
        </div>
      )}

      {loaded && !loading && entries.length > 0 && (
        <>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-caption">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACTION_VARIANT[entry.action] ?? "outline"}>
                        {formatAction(entry.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-caption">
                      {entry.target_type && entry.target_id
                        ? `${entry.target_type} #${entry.target_id}`
                        : entry.target_type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-caption">
                      {entry.admin_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-caption max-w-xs truncate">
                      {formatDetails(entry.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-body-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total} total entries
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => handlePage(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => handlePage(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
