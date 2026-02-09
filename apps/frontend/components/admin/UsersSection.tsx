"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../lib/apiClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const PLAN_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'User is fully billable and can receive scans.' },
  { value: 'pending_payment', label: 'Pending payment', description: 'User cannot receive new mail until payment is completed.' },
  { value: 'cancelled', label: 'Cancelled', description: 'Account cancelled. Mail ingest should be blocked.' },
  { value: 'trialing', label: 'Trial', description: 'Limited trial access.' },
] as const;

const PLAN_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  pending_payment: 'bg-amber-50 text-amber-800',
  cancelled: 'bg-rose-50 text-rose-700',
  trialing: 'bg-sky-50 text-sky-700',
};

const formatPlanStatus = (value?: string) => {
  if (!value) return 'pending payment';
  const option = PLAN_STATUS_OPTIONS.find((opt) => opt.value === value);
  return option ? option.label : value.replace(/_/g, ' ');
};

type AdminUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  status?: string;
  plan_name?: string;
  plan_status?: string;
  plan_price?: number;
  plan_interval?: string;
  kyc_status?: string;
  deleted_at?: string;
};

interface UsersSectionProps {
  users: any[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isValidating: boolean;
  onFiltersChange?: (filters: {
    search: string;
    status: string;
    plan_id: string;
    kyc_status: string;
  }) => void;
  onRefreshUsers?: () => void;
}

export default function UsersSection({ users, loading, error, total, page, pageSize, onPageChange, isValidating, onFiltersChange, onRefreshUsers }: UsersSectionProps) {
  const { toast } = useToast();

  // Search state (raw input)
  const [q, setQ] = useState("");

  // Debounce search query (300ms delay)
  const debouncedQ = useDebouncedValue(q, 300);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [planFilter, setPlanFilter] = useState<string>("__all__");
  const [kycFilter, setKycFilter] = useState<string>("__all__");

  // Deleted users view toggle
  const [showDeleted, setShowDeleted] = useState(false);

  // Additional state for managing deleted users API call
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [deletedUsersLoading, setDeletedUsersLoading] = useState(false);

  // User stats state
  const [stats, setStats] = useState<{ total: number; active: number; suspended: number; pending: number; deleted: number } | null>(null);

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState<null | { id: string | number; email: string; permanent?: boolean }>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Restore modal state
  const [restoreModal, setRestoreModal] = useState<null | { id: string | number }>(null);
  const [restoreForm, setRestoreForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    reactivate: true
  });

  // Plan status modal state
  const [planStatusModal, setPlanStatusModal] = useState<null | { id: string | number; email: string; plan_status?: string }>(null);
  const [planStatusValue, setPlanStatusValue] = useState<string>('pending_payment');
  const [kycModal, setKycModal] = useState<null | { id: string | number; email: string; kyc_status?: string | null }>(null);
  const [kycValue, setKycValue] = useState<string>('pending');

  // Mutation state
  const [isMutating, setIsMutating] = useState(false);

  // Track previous filter values to only reset page when filters actually change
  const prevFiltersRef = useRef({ debouncedQ, statusFilter, planFilter, kycFilter });

  // Reset page when search changes (after debounce) or when filters change
  // BUT only if the values have actually changed (not on initial mount)
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const hasChanged = 
      prev.debouncedQ !== debouncedQ ||
      prev.statusFilter !== statusFilter ||
      prev.planFilter !== planFilter ||
      prev.kycFilter !== kycFilter;
    
    if (hasChanged) {
    onPageChange(1);
      prevFiltersRef.current = { debouncedQ, statusFilter, planFilter, kycFilter };
    }
  }, [debouncedQ, statusFilter, planFilter, kycFilter, onPageChange]);

  // Call onFiltersChange when any filter changes (use debounced query)
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        search: debouncedQ,
        status: statusFilter === "__all__" ? "" : statusFilter,
        plan_id: planFilter === "__all__" ? "" : planFilter,
        kyc_status: kycFilter === "__all__" ? "" : kycFilter,
      });
    }
  }, [debouncedQ, statusFilter, planFilter, kycFilter, onFiltersChange]);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    const res = await adminApi.userStats();
    if (res.ok) setStats(res.data as any);
  }, []);

  useEffect(() => { loadUserStats(); }, [loadUserStats]);

  // Load deleted users when showDeleted toggle changes
  useEffect(() => {
    if (showDeleted) {
      console.log('[UsersSection] Loading deleted users...');
      loadDeletedUsers();
    } else {
      console.log('[UsersSection] Clearing deleted users...');
      setDeletedUsers([]);
    }
  }, [showDeleted]);

  // Reset plan status value whenever modal opens
  useEffect(() => {
    if (planStatusModal) {
      setPlanStatusValue(planStatusModal.plan_status ?? 'pending_payment');
    }
  }, [planStatusModal]);

  useEffect(() => {
    if (kycModal) {
      setKycValue(kycModal.kyc_status ?? 'pending');
    }
  }, [kycModal]);

  const loadDeletedUsers = async () => {
    setDeletedUsersLoading(true);
    try {
      console.log('[UsersSection] Fetching deleted users from API...');
      const params = new URLSearchParams();
      const res = await adminApi.deletedUsers(params);
      console.log('[UsersSection] Deleted users API response:', res);
      if (res.ok && res.data) {
        // Backend returns { items: [...], total: ..., pages: ... }
        const payload: any = res.data;
        const users = Array.isArray(payload) ? payload : payload?.items || [];
        setDeletedUsers(users);
        console.log('[UsersSection] Set deleted users:', users.length, 'users');
      } else {
        console.error('[UsersSection] API returned error:', res);
      }
    } catch (error) {
      console.error('Failed to load deleted users:', error);
      toast({ title: 'Error', description: 'Failed to load deleted users', variant: 'destructive' });
    } finally {
      setDeletedUsersLoading(false);
    }
  };

  // Handle user deletion with double confirmation
  async function handleDeleteUser(id: string | number, permanent: boolean = false) {
    // First confirmation: Modal with email typing
    if (!deleteModal || !deleteConfirm.trim()) return;

    if (deleteConfirm.trim().toLowerCase() !== deleteModal.email.toLowerCase()) {
      toast({ title: 'Confirmation mismatch', description: 'Email does not match.', variant: 'destructive' });
      return;
    }

    // Second confirmation: Native browser confirm with stronger warning for permanent delete
    const confirmMessage = permanent
      ? `⚠️ PERMANENT DELETE ⚠️\n\nThis will PERMANENTLY delete user ${deleteModal.email} and ALL their data from the database.\n\nThis action CANNOT be undone. The user and all associated records will be completely removed.\n\nAre you absolutely certain you want to proceed?`
      : `This will soft-delete user ${deleteModal.email}. They can be restored later.\n\nAre you sure you want to proceed?`;

    if (!window.confirm(confirmMessage)) {
      setDeleteModal(null);
      setDeleteConfirm('');
      return;
    }

    // Third confirmation for permanent delete - require typing "DELETE PERMANENTLY"
    if (permanent) {
      const finalConfirm = prompt(`⚠️ FINAL CONFIRMATION ⚠️\n\nType "DELETE PERMANENTLY" (all caps) to confirm permanent deletion of ${deleteModal.email}:\n\nThis will completely remove the user and all data. This cannot be undone.`);
      if (finalConfirm !== 'DELETE PERMANENTLY') {
        toast({ title: 'Cancelled', description: 'Permanent delete cancelled. Confirmation text did not match.', variant: 'default' });
        setDeleteModal(null);
        setDeleteConfirm('');
        return;
      }
    }

    setIsMutating(true);

    try {
      const res = await adminApi.deleteUser(id, permanent);
      if (!res.ok) throw new Error('delete_failed');

      const actionType = permanent ? 'permanently deleted' : 'soft-deleted';
      toast({ 
        title: permanent ? '⚠️ User Permanently Deleted' : 'User Deleted', 
        description: `User ${deleteModal.email} has been ${actionType}${permanent ? '. This cannot be undone.' : '. They can be restored later.'}`,
        variant: permanent ? 'destructive' : 'default'
      });

      // Refresh data from parent and deleted users
      await Promise.all([
        loadUserStats(),
        showDeleted ? loadDeletedUsers() : Promise.resolve(),
        onRefreshUsers ? onRefreshUsers() : Promise.resolve()
      ]);
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
      if (!res.ok) throw new Error('restore_failed');

      toast({ title: 'User restored', description: `User restored with email ${restoreForm.email}` });

      // Refresh data from parent and deleted users
      await Promise.all([
        loadUserStats(),
        showDeleted ? loadDeletedUsers() : Promise.resolve(),
        onRefreshUsers ? onRefreshUsers() : Promise.resolve()
      ]);

      // Close modal
      setRestoreModal(null);
      setRestoreForm({ email: '', first_name: '', last_name: '', reactivate: true });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Restore failed', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  }

  // Server-side filtering - show ONLY deleted users when showDeleted is true
  // Backend already returns paginated data, so we don't need to paginate again
  const displayUsers = useMemo(() => {
    if (showDeleted) {
      // When showing deleted, show ONLY deleted users
      return deletedUsers;
    }
    // When not showing deleted, only show active users (already paginated by backend)
    return users;
  }, [users, deletedUsers, showDeleted]);

  // Pagination helpers - use backend total for accurate counts
  const totalFiltered = showDeleted ? deletedUsers.length : total; // Use backend total for active users
  const hasNext = useMemo(() => {
    if (showDeleted) {
      // For deleted users, check if there are more items (no backend pagination yet)
      return deletedUsers.length >= pageSize;
    }
    // For active users, backend provides accurate pagination info
    return (page * pageSize) < total;
  }, [page, pageSize, total, deletedUsers.length, showDeleted]);
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Plan:</label>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="1">Virtual Annual</SelectItem>
              <SelectItem value="2">Virtual Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">KYC:</label>
          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>


        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatusFilter("__all__");
            setPlanFilter("__all__");
            setKycFilter("__all__");
            setQ(""); // Also clear search
            onPageChange(1); // Reset to first page
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            {showDeleted ? `Showing ${users.length + deletedUsers.length} users (${users.length} active + ${deletedUsers.length} deleted)` : `Total: ${users.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showDeleted ? "primary" : "ghost"}
            onClick={() => {
              console.log('[UsersSection] Toggle showDeleted from', showDeleted, 'to', !showDeleted);
              setShowDeleted(!showDeleted);
            }}
            size="sm"
            className="gap-2"
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"}
            {deletedUsersLoading && <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>}
          </Button>
          <Input
            placeholder="Search ID, name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-60"
          />
        </div>
      </div>

      {/* Status row */}
      {loading || deletedUsersLoading && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading users…
        </div>
      )}
      {error && (
        <div className="text-center py-2">
          <div className="text-sm text-red-600 mb-2">{error}</div>
        </div>
      )}
      {!loading && !deletedUsersLoading && !error && displayUsers.length === 0 && (
        <div className="text-center py-2">
          <div className="text-sm text-muted-foreground mb-2">No users yet.</div>
        </div>
      )}

      {/* Users table */}
      <div className="relative">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Plan status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {error ?? "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                displayUsers.map((u) => {
                  const planStatusValue = u.plan_status ?? 'pending_payment';
                  const planStatusClass = PLAN_STATUS_STYLES[planStatusValue] ?? 'bg-neutral-100 text-neutral-700';
                  return (
                  <TableRow key={u.id} className={u.deleted_at ? "opacity-60 bg-red-50" : ""}>
                    <TableCell className="font-mono text-sm">
                      {u.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{u.email}</span>
                        {u.deleted_at && <Badge variant="destructive" className="text-xs">Deleted</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      {u.company_name || <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : u.status === "suspended" ? "destructive" : "secondary"}>
                        {u.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.plan_name ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{u.plan_name}</span>
                          <span className="text-xs text-muted-foreground">
                            £{((u.plan_price || 0) / 100).toFixed(2)}/{u.plan_interval}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${planStatusClass}`}>
                        {formatPlanStatus(planStatusValue)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.kyc_status || "pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPlanStatusModal({ id: u.id, email: u.email, plan_status: u.plan_status })}
                              disabled={isMutating}
                            >
                              Plan status
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setKycModal({ id: u.id, email: u.email, kyc_status: u.kyc_status })}
                              disabled={isMutating}
                            >
                              KYC
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isMutating}
                                >
                                  Delete
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuItem
                                  onClick={() => setDeleteModal({ id: u.id, email: u.email, permanent: false })}
                                  className="cursor-pointer"
                                >
                                  <div className="w-full">
                                    <div className="font-medium text-gray-900">Soft Delete</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Can be restored later</div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteModal({ id: u.id, email: u.email, permanent: true })}
                                  className="cursor-pointer text-red-700 focus:text-red-700 focus:bg-red-50"
                                >
                                  <div className="w-full">
                                    <div className="font-bold">⚠️ Permanent Delete</div>
                                    <div className="text-xs text-red-600 mt-0.5 font-semibold">Cannot be undone!</div>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        {/* Loading overlay */}
        {loading || deletedUsersLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-sm">Loading…</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} • {totalFiltered} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrev || loading || deletedUsersLoading}
            onClick={() => {
              const next = Math.max(1, page - 1);
              onPageChange(next);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext || loading || deletedUsersLoading}
            onClick={() => {
              const next = page + 1;
              onPageChange(next);
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`bg-card border-2 rounded-2xl p-6 w-full max-w-md ${deleteModal.permanent ? 'border-red-300' : 'border-yellow-200'}`}>
            <h3 className={`font-semibold text-lg mb-2 ${deleteModal.permanent ? 'text-red-700' : ''}`}>
              {deleteModal.permanent ? '⚠️ Permanent Delete User' : 'Delete User'}
            </h3>
            <div className="space-y-4">
              {deleteModal.permanent ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-900">
                    ⚠️ WARNING: PERMANENT DELETION ⚠️
                  </p>
                  <p className="text-sm text-red-800">
                    This will <strong>PERMANENTLY</strong> delete user <span className="font-mono font-semibold">{deleteModal.email}</span> and <strong>ALL</strong> their data from the database.
                  </p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1 ml-2">
                    <li>User account will be completely removed</li>
                    <li>All mail items will be deleted</li>
                    <li>All subscriptions will be deleted</li>
                    <li>All business owner records will be deleted</li>
                    <li>This action <strong>CANNOT be undone</strong></li>
                  </ul>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    This will <strong>soft-delete</strong> user <span className="font-mono">{deleteModal.email}</span>.
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    The user can be restored later. Their data will be hidden but not permanently removed.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Type the email <span className="font-mono font-semibold">{deleteModal.email}</span> to confirm:
              </p>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Type email to confirm"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => {
                setDeleteModal(null);
                setDeleteConfirm('');
              }} disabled={isMutating}>
                Cancel
              </Button>
              <Button
                variant={deleteModal.permanent ? "destructive" : "default"}
                onClick={() => handleDeleteUser(deleteModal.id, deleteModal.permanent || false)}
                disabled={isMutating || deleteConfirm.trim().toLowerCase() !== deleteModal.email.toLowerCase()}
                className={deleteModal.permanent ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isMutating 
                  ? (deleteModal.permanent ? 'Permanently Deleting…' : 'Deleting…') 
                  : (deleteModal.permanent ? '⚠️ Delete Permanently' : 'Soft Delete')
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore modal */}
      {restoreModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Restore Deleted User</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will restore the user account and allow them to log in again.
              Provide a new unique email address for the restored account.
            </p>
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

      {/* Plan status modal */}
      {planStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="font-semibold text-lg mb-1">Update plan status</h3>
              <p className="text-sm text-muted-foreground">
                Adjust billing/state enforcement for {planStatusModal.email}.
            </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Plan status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                value={planStatusValue}
                onChange={(e) => setPlanStatusValue(e.target.value)}
                >
                {PLAN_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                      </option>
                    ))}
                </select>
                  {(() => {
                const option = PLAN_STATUS_OPTIONS.find((opt) => opt.value === planStatusValue);
                return option ? (
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                ) : null;
                  })()}
                </div>

            <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <p>
                This value is what the mail ingest worker checks before accepting PDFs.
              </p>
              <p>
                Set to <strong>pending payment</strong> to block scans until billing is fixed.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPlanStatusModal(null)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!planStatusModal) return;
                  setIsMutating(true);
                  try {
                    const res = await adminApi.updateUser(planStatusModal.id, {
                      plan_status: planStatusValue,
                    });
                    if (!res.ok) {
                      throw new Error(res.error || 'update_failed');
                    }
                    toast({
                      title: 'Plan status updated',
                      description: `${planStatusModal.email} is now ${formatPlanStatus(planStatusValue)}.`,
                    });
                    setPlanStatusModal(null);
                    if (onRefreshUsers) {
                      await onRefreshUsers();
                    }
                  } catch (error: any) {
                    toast({
                      title: 'Failed to update plan status',
                      description: error?.message ?? 'Unknown error',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsMutating(false);
                  }
                }}
                disabled={isMutating}
              >
                {isMutating ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KYC modal */}
      {kycModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="text-lg font-semibold mb-1">Update KYC status</h3>
              <p className="text-sm text-muted-foreground">
                Change KYC status for {kycModal.email}.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kyc-status">KYC status</Label>
              <select
                id="kyc-status"
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={kycValue}
                onChange={(e) => setKycValue(e.target.value)}
              >
                <option value="approved">Approved</option>
                <option value="verified">Verified (legacy)</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setKycModal(null)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!kycModal) return;
                  setIsMutating(true);
                  try {
                    const res = await adminApi.updateUser(kycModal.id, {
                      kyc_status: kycValue,
                    });
                    if (!res.ok) {
                      throw new Error(res.error || "update_failed");
                      }
                      toast({
                      title: "KYC status updated",
                      description: `${kycModal.email} is now ${kycValue}.`,
                      });
                    setKycModal(null);
                    if (onRefreshUsers) {
                      await onRefreshUsers();
                    }
                  } catch (error: any) {
                    toast({
                      title: "Failed to update KYC",
                      description: error?.message ?? "Unknown error",
                      variant: "destructive",
                    });
                  } finally {
                    setIsMutating(false);
                  }
                }}
                disabled={isMutating}
              >
                {isMutating ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}