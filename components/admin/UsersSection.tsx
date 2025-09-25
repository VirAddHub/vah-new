"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";

type AdminUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  plan?: string;
  kyc_status?: string;
  created_at?: string;
};

export default function UsersSection() {
  const { toast } = useToast();
  
  // Search and pagination state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isFetching, setIsFetching] = useState(false);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [confirming, setConfirming] = useState<null | { id: string | number; email: string }>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  // User stats state
  const [stats, setStats] = useState<{ total: number; deleted: number; suspended: number } | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // Debounce and abort handling
  const debouncedQ = useRef(q);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce the query (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      debouncedQ.current = q;
      setPage(1); // only reset page AFTER debounce, not on each key stroke
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);
    setError(null);
    
    try {
      const params = new URLSearchParams([
        ["q", debouncedQ.current],
        ["page", String(page)],
        ["page_size", String(pageSize)],
      ]);
      const res = await adminApi.users(params, { signal: controller.signal });
      if (res.ok) {
        setItems(res.data?.items ?? []);
        setTotal(Number(res.data?.total ?? 0));
      } else {
        setItems([]);
        setTotal(0);
        setError("Failed to load users");
      }
    } catch (e) {
      if ((e as any).name !== "AbortError") {
        console.error(e);
        setError("Network error while fetching users");
      }
    } finally {
      if (abortRef.current === controller) setIsFetching(false);
    }
  }, [page, pageSize]);

  useEffect(() => { void load(); }, [page, load]);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    const res = await adminApi.userStats();
    if (res.ok) setStats(res.data);
  }, []);

  useEffect(() => { loadUserStats(); }, [loadUserStats]);

  // Handle user deletion with double confirmation
  async function handleDeleteUser() {
    if (!confirming) return;
    if (confirmText.trim().toLowerCase() !== confirming.email.toLowerCase()) {
      toast({ title: 'Confirmation mismatch', description: 'Email does not match.', variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      const res = await adminApi.deleteUser(confirming.id);
      if (!res.ok) throw new Error(res.error || 'delete_failed');
      toast({ title: 'User deleted', description: confirming.email });
      setConfirming(null);
      setConfirmText('');
      await load(); // refresh the user list
      await loadUserStats(); // refresh stats
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Failed to delete user', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  }

  // Pagination helpers
  const hasNext = useMemo(() => page * pageSize < total, [page, pageSize, total]);
  const hasPrev = useMemo(() => page > 1, [page]);

  return (
    <div className="space-y-4">
      {/* Deleted users banner */}
      {stats && stats.deleted > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border bg-amber-50 px-3 py-2 text-sm">
          <span>{stats.deleted} deleted user{stats.deleted > 1 ? 's' : ''} hidden.</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
                void load();
              }}
            >
              {showDeleted ? 'Hide deleted' : 'View deleted'}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Total: {total}</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-60"
          />
          <Button variant="outline" onClick={() => load()} disabled={isFetching}>
            Search
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="relative">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {error ?? "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>
                        {u.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.plan || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.kyc_status || "pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming({ id: u.id, email: u.email })}
                        disabled={isMutating}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Loading overlay - keep rows, add subtle overlay spinner */}
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-sm">Loading…</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} • {total} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrev || isFetching}
            onClick={() => {
              const next = Math.max(1, page - 1);
              setPage(next);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext || isFetching}
            onClick={() => {
              const next = page + 1;
              setPage(next);
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Delete user?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will remove access and anonymize their data. Type
              <span className="font-mono"> {confirming.email} </span>
              to confirm.
            </p>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirming.email}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => { 
                  setConfirming(null); 
                  setConfirmText(''); 
                }} 
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser} 
                disabled={isMutating || confirmText.length === 0}
              >
                {isMutating ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}