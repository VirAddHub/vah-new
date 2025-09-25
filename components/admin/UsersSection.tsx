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
  deleted_at?: string;
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

  // Deleted users view toggle
  const [showDeleted, setShowDeleted] = useState(false);

  // User stats state
  const [stats, setStats] = useState<{ total: number; active: number; suspended: number; pending: number; deleted: number } | null>(null);

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState<null | { id: string | number; email: string }>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Restore modal state
  const [restoreModal, setRestoreModal] = useState<null | { id: string | number }>(null);
  const [restoreForm, setRestoreForm] = useState({ 
    email: '', 
    first_name: '', 
    last_name: '', 
    reactivate: true 
  });

  // Mutation state
  const [isMutating, setIsMutating] = useState(false);

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
      
      if (showDeleted) params.set('include_deleted', 'true');

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
  }, [page, pageSize, showDeleted]);

  useEffect(() => { void load(); }, [page, load]);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    const res = await adminApi.userStats();
    if (res.ok) setStats(res.data);
  }, []);

  useEffect(() => { loadUserStats(); }, [loadUserStats]);

  // Handle user deletion with double confirmation
  async function handleDeleteUser(id: string | number) {
    setIsMutating(true);
    try {
      const res = await adminApi.deleteUser(id);
      if (!res.ok) throw new Error(res.error || 'delete_failed');
      toast({ title: 'User deleted' });
      await Promise.all([load(), loadUserStats()]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Delete failed', variant: 'destructive' });
    } finally { 
      setIsMutating(false); 
      setDeleteModal(null); 
      setDeleteConfirm(''); 
    }
  }

  // Handle user restoration
  async function handleRestoreUser() {
    if (!restoreModal) return;
    if (!restoreForm.email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      const res = await adminApi.restoreUser(restoreModal.id, restoreForm);
      if (!res.ok) throw new Error(res.error || 'restore_failed');
      toast({ title: 'User restored' });
      await Promise.all([load(), loadUserStats()]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Restore failed', variant: 'destructive' });
    } finally { 
      setIsMutating(false); 
      setRestoreModal(null); 
    }
  }

  // Pagination helpers
  const hasNext = useMemo(() => page * pageSize < total, [page, pageSize, total]);
  const hasPrev = useMemo(() => page > 1, [page]);

  return (
    <div className="space-y-4">
      {/* User stats badges */}
      {stats && (
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>Total: {stats.total}</span>
          <span>Active: {stats.active}</span>
          <span>Suspended: {stats.suspended}</span>
          <span>Pending: {stats.pending}</span>
          <span className="text-red-600">Deleted: {stats.deleted}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Total: {total}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showDeleted ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowDeleted(!showDeleted);
              setPage(1);
              void load();
            }}
          >
            {showDeleted ? 'Hide deleted' : 'Show deleted'}
          </Button>
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
                      {u.deleted_at ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreModal({ id: u.id })}
                          disabled={isMutating}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteModal({ id: u.id, email: u.email })}
                          disabled={isMutating}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Loading overlay */}
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
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Delete user</h3>
            <p className="text-sm text-muted-foreground">
              This will soft-delete and anonymize this user. Type the email
              <span className="font-mono"> {deleteModal.email} </span>
              to confirm.
            </p>
            <input
              className="mt-4 w-full border rounded px-3 py-2"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={deleteModal.email}
            />
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm.trim().toLowerCase() === deleteModal.email.toLowerCase() && handleDeleteUser(deleteModal.id)}
                disabled={isMutating || deleteConfirm.trim().toLowerCase() !== deleteModal.email.toLowerCase()}
              >
                {isMutating ? 'Deleting…' : 'Confirm delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore modal */}
      {restoreModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Restore user</h3>
            <p className="text-sm text-muted-foreground mb-4">Provide a new unique email.</p>
            <div className="space-y-3">
              <input 
                className="w-full border rounded px-3 py-2" 
                placeholder="new-email@example.com"
                value={restoreForm.email} 
                onChange={e => setRestoreForm(f => ({ ...f, email: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  className="border rounded px-3 py-2" 
                  placeholder="First name"
                  value={restoreForm.first_name} 
                  onChange={e => setRestoreForm(f => ({ ...f, first_name: e.target.value }))}
                />
                <input 
                  className="border rounded px-3 py-2" 
                  placeholder="Last name"
                  value={restoreForm.last_name} 
                  onChange={e => setRestoreForm(f => ({ ...f, last_name: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={restoreForm.reactivate}
                  onChange={e => setRestoreForm(f => ({ ...f, reactivate: e.target.checked }))}
                />
                Reactivate (status → active)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setRestoreModal(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleRestoreUser} disabled={isMutating || !restoreForm.email.trim()}>
                {isMutating ? 'Restoring…' : 'Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}