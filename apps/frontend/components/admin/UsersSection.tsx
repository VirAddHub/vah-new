"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { customerAccessNotes, customerStatusLabel } from './customer-access';
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
  { value: 'active', label: 'Active', description: 'Billing is active. Account access and verification are checked separately.' },
  { value: 'pending_payment', label: 'Pending payment', description: 'User cannot receive new mail until payment is completed.' },
  { value: 'cancelled', label: 'Cancelled', description: 'Plan cancelled. This does not change account access.' },
  { value: 'trialing', label: 'Trial', description: 'Limited trial access.' },
] as const;

const PLAN_STATUS_STYLES: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  pending_payment: 'bg-amber-50 text-amber-800',
  cancelled: 'bg-destructive/10 text-destructive',
  trialing: 'bg-sky-50 text-sky-700',
};

const formatPlanStatus = (value?: string) => {
  if (!value) return 'Not recorded';
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
  locked_until?: string | number | null;
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
  lastUpdated?: number | null;
  onFiltersChange?: (filters: {
    search: string;
    status: string;
    plan_id: string;
    kyc_status: string;
  }) => void;
  onRefreshUsers?: () => void;
}

export default function UsersSection({ users, loading, error, total, page, pageSize, onPageChange, isValidating, onFiltersChange, onRefreshUsers, lastUpdated }: UsersSectionProps) {
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
  const [deletedTotal, setDeletedTotal] = useState(0);
  const deletedRequest = useRef(0);

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
  const [planStatusModal, setPlanStatusModal] = useState<null | { id: string | number; email: string; plan_status?: string; status?: string }>(null);
  const [planStatusValue, setPlanStatusValue] = useState<string>('pending_payment');
  const [accountStatusValue, setAccountStatusValue] = useState('pending');
  const [plans, setPlans] = useState<{id: string | number; name: string}[]>([]);
  const [plansError, setPlansError] = useState(false);
  const [deletedError, setDeletedError] = useState<string | null>(null);
  const [kycModal, setKycModal] = useState<null | { id: string | number; email: string; kyc_status?: string | null }>(null);
  const [kycValue, setKycValue] = useState<string>('pending');

  // Create user modal state
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', first_name: '', last_name: '', company_name: '', plan_status: 'pending_payment' });
  const [createError, setCreateError] = useState('');

  // Edit profile modal state
  const [editModal, setEditModal] = useState<null | AdminUser>(null);
  const [editForm, setEditForm] = useState({ email: '', first_name: '', last_name: '', company_name: '' });

  // Password reset sending state
  const [resetSendingId, setResetSendingId] = useState<string | number | null>(null);

  // Account unlock state
  const [unlockingId, setUnlockingId] = useState<string | number | null>(null);

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

  const [refreshing, setRefreshing] = useState(false);
  const [deletedLastUpdated, setDeletedLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getPlans().then(res => {
      if (!res.ok || !Array.isArray(res.data)) throw new Error('Plans unavailable');
      if (!cancelled) { setPlans(res.data); setPlansError(false); }
    }).catch(() => { if (!cancelled) setPlansError(true); });
    return () => { cancelled = true; };
  }, []);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    const res = await adminApi.userStats();
    if (res.ok) setStats(res.data as any);
  }, []);

  useEffect(() => { void loadUserStats().catch(() => {}); }, [loadUserStats, lastUpdated]);

  // Reload deleted accounts when their search or page changes.
  useEffect(() => {
    if (showDeleted) {
      console.log('[UsersSection] Loading deleted users...');
      loadDeletedUsers();
    } else {
      console.log('[UsersSection] Clearing deleted users...');
      deletedRequest.current++;
      setDeletedUsers([]);
      setDeletedUsersLoading(false);
    }
  }, [showDeleted, debouncedQ, page, pageSize]);

  // Reset plan status value whenever modal opens
  useEffect(() => {
    if (planStatusModal) {
      setPlanStatusValue(planStatusModal.plan_status ?? 'pending_payment');
      setAccountStatusValue(planStatusModal.status ?? 'pending');
    }
  }, [planStatusModal]);

  useEffect(() => {
    if (kycModal) {
      setKycValue(kycModal.kyc_status ?? 'pending');
    }
  }, [kycModal]);

  const loadDeletedUsers = async () => {
    const request = ++deletedRequest.current;
    setDeletedUsers([]);
    setDeletedTotal(0);
    setDeletedError(null);
    setDeletedUsersLoading(true);
    try {
      console.log('[UsersSection] Fetching deleted users from API...');
      const params = new URLSearchParams({q:debouncedQ, page:String(page), limit:String(pageSize)});
      const res = await adminApi.deletedUsers(params);
      if (request !== deletedRequest.current) return;
      console.log('[UsersSection] Deleted users API response:', res);
      if (res.ok && res.data) {
        // Backend returns { items: [...], total: ..., pages: ... }
        const payload: any = res.data;
        const users = Array.isArray(payload) ? payload : payload?.items || [];
        setDeletedUsers(users);
        setDeletedTotal(Number(payload?.total ?? users.length));
        setDeletedLastUpdated(Date.now());
        console.log('[UsersSection] Set deleted users:', users.length, 'users');
      } else {
        setDeletedError('Could not load deleted accounts. Use Refresh to try again.');
      }
    } catch (error) {
      if (request !== deletedRequest.current) return;
      setDeletedError('Could not load deleted accounts. Use Refresh to try again.');
      console.error('Failed to load deleted users:', error);
      toast({ title: 'Error', description: 'Failed to load deleted users', variant: 'destructive' });
    } finally {
      if (request === deletedRequest.current) setDeletedUsersLoading(false);
    }
  };

  async function refreshAccounts() {
    setRefreshing(true);
    try {
      await Promise.all([showDeleted ? loadDeletedUsers() : onRefreshUsers?.(), loadUserStats()]);
    } catch {
      toast({ title: 'Refresh failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  }

  // SWR refreshes current accounts on focus/reconnect. Deleted accounts use their own endpoint.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void loadUserStats().catch(() => {});
      if (showDeleted) void loadDeletedUsers();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [showDeleted, debouncedQ, page, pageSize, loadUserStats]);

  const displayedLastUpdated = showDeleted ? deletedLastUpdated : lastUpdated;

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
  const totalFiltered = showDeleted ? deletedTotal : total; // Use backend total for active users
  const hasNext = useMemo(() => {
    if (showDeleted) {
      // Use the deleted-account endpoint total, not the current page size.
      return page * pageSize < deletedTotal;
    }
    // For active users, backend provides accurate pagination info
    return (page * pageSize) < total;
  }, [page, pageSize, total, deletedTotal, showDeleted]);
  const hasPrev = useMemo(() => page > 1, [page]);

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Customer accounts</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600" role="status">Last updated: {displayedLastUpdated ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(displayedLastUpdated) : 'Not yet loaded'}</span>
            <Button variant="outline" disabled={refreshing || isValidating || deletedUsersLoading} onClick={refreshAccounts}>{refreshing || isValidating || deletedUsersLoading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        </div>
        <label htmlFor="customer-search" className="block text-sm font-medium">Find a customer</label>
        <Input id="customer-search" type="search" placeholder="Name, company, email or customer ID (e.g. #53)" value={q} onChange={e => setQ(e.target.value)} className="w-full max-w-2xl !text-base !h-11" />
      </header>
      {/* User stats badges */}
      {stats && (
        <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
          <span>Total: {stats.total}</span>
          <span>Active: {stats.active}</span>
          <span>Suspended: {stats.suspended}</span>
          <span>Pending: {stats.pending}</span>
          <span className="text-destructive">Deleted: {stats.deleted}</span>
        </div>
      )}

      {showDeleted && <p className="text-sm text-neutral-600">Search deleted accounts by name, company, email or ID. Status, plan and verification filters apply to current accounts only.</p>}
      {plansError && <p role="alert" className="text-sm text-destructive">Plan filters could not load. Reload the page to try again.</p>}
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-body-sm font-medium">Account access:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger disabled={showDeleted} className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white text-neutral-900">
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-body-sm font-medium">Plan:</label>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger disabled={showDeleted || plansError || plans.length === 0} className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white text-neutral-900">
              <SelectItem value="__all__">All</SelectItem>
              {plans.map(plan => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-body-sm font-medium">Identity check:</label>
          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger disabled={showDeleted} className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white text-neutral-900">
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved / verified</SelectItem>
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
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{showDeleted ? "Deleted accounts" : "Customer results"}</h3>
          <p className="text-body-sm text-muted-foreground">
            {showDeleted ? (deletedError ? 'Deleted accounts unavailable' : `${deletedTotal} matching deleted accounts · Page ${page}`) : `${total} matching customers · Page ${page}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setCreateForm({ email: '', first_name: '', last_name: '', company_name: '', plan_status: 'pending_payment' }); setCreateError(''); setCreateModal(true); }}
          >
            + Create user
          </Button>
          <Button
            variant={showDeleted ? "primary" : "ghost"}
            onClick={() => {
              console.log('[UsersSection] Toggle showDeleted from', showDeleted, 'to', !showDeleted);
              onPageChange(1);
              setShowDeleted(!showDeleted);
            }}
            size="sm"
            className="gap-2"
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"}
            {deletedUsersLoading && <div className="animate-spin rounded-full h-3 w-3 border-b border-background"></div>}
          </Button>

        </div>
      </div>

      {/* Status row */}
      {(loading || deletedUsersLoading) && (
        <div className="text-center py-2 text-body-sm text-muted-foreground">
          Loading users…
        </div>
      )}
      {showDeleted && deletedError && <p role="alert" className="text-sm text-destructive">{deletedError}</p>}
      {error && !showDeleted && (
        <div className="text-center py-2">
          <div className="text-body-sm text-destructive mb-2">{error}</div>
        </div>
      )}
      {!loading && !deletedUsersLoading && !(showDeleted ? deletedError : error) && displayUsers.length === 0 && (
        <div className="text-center py-2">
          <div className="text-body-sm text-muted-foreground mb-2">No matching customers. Try another search or clear the filters.</div>
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
                <TableHead>Account access</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Identity check</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    {(showDeleted ? deletedError : error) ?? "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                displayUsers.map((u) => {
                  const access = customerAccessNotes(u);
                  const planStatusValue = u.plan_status ?? '';
                  const planStatusClass = PLAN_STATUS_STYLES[planStatusValue] ?? 'bg-muted text-muted-foreground';
                  return (
                  <Fragment key={u.id}>
                  <TableRow className={u.deleted_at ? "opacity-60 bg-destructive/10" : ""}>
                    <TableCell className="font-mono text-body-sm">
                      {u.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{u.email}</span>
                        {u.deleted_at && <Badge variant="destructive" className="text-caption">Deleted</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      {u.company_name || <span className="text-body-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={u.status === "active" ? "default" : u.status === "suspended" ? "destructive" : "secondary"}>
                          {customerStatusLabel(u.status)}
                        </Badge>
                        {u.locked_until && Number(u.locked_until) > Date.now() && (
                          <span className="inline-flex items-center text-caption text-amber-700 font-medium">
                            🔒 Locked until {new Date(Number(u.locked_until)).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.plan_name ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-body-sm font-medium">{u.plan_name}</span>
                          {(u.plan_price != null && u.plan_price > 0) || u.plan_interval ? (
                            <span className="text-caption text-muted-foreground">
                              £{((u.plan_price || 0) / 100).toFixed(2)}/
                              {u.plan_interval || 'month'}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <details className="text-sm text-neutral-600"><summary className="cursor-pointer">Plan not identified</summary><p className="mt-1">A plan name could not be found. Check billing to confirm payment and subscription details.</p></details>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-caption font-medium ${planStatusClass}`}>
                        {formatPlanStatus(planStatusValue)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customerStatusLabel(u.kyc_status || "pending")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
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
                              onClick={() => { setEditForm({ email: u.email, first_name: u.first_name ?? '', last_name: u.last_name ?? '', company_name: u.company_name ?? '' }); setEditModal(u); }}
                              disabled={isMutating}
                            >
                              Edit profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPlanStatusModal({ id: u.id, email: u.email, plan_status: u.plan_status, status: u.status })}
                              disabled={isMutating}
                            >
                              Account &amp; plan status
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setKycModal({ id: u.id, email: u.email, kyc_status: u.kyc_status })}
                              disabled={isMutating}
                            >
                              Verification (KYC)
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isMutating}>
                                  More actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto bg-white text-neutral-900">
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setResetSendingId(u.id);
                                    try {
                                      const res = await fetch(`/api/admin/users/send-password-reset?id=${u.id}`, { method: 'POST', credentials: 'include' });
                                      const json = await res.json().catch(() => ({}));
                                      if (!res.ok) throw new Error(json.message || 'Failed');
                                      toast({ title: 'Password reset sent', description: `Reset email sent to ${u.email}.` });
                                    } catch (e: any) {
                                      toast({ title: 'Failed to send reset', description: e.message, variant: 'destructive' });
                                    } finally {
                                      setResetSendingId(null);
                                    }
                                  }}
                                  className="cursor-pointer"
                                  disabled={resetSendingId === u.id}
                                >
                                  <div className="w-full">
                                    <div className="font-medium text-foreground">{resetSendingId === u.id ? 'Sending…' : 'Send password reset'}</div>
                                    <div className="text-caption text-muted-foreground mt-0.5">Emails a reset link to the user</div>
                                  </div>
                                </DropdownMenuItem>
                                {u.locked_until && Number(u.locked_until) > Date.now() && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      setUnlockingId(u.id);
                                      try {
                                        const res = await adminApi.unlockAccount(u.id);
                                        if (!res.ok) throw new Error('unlock_failed');
                                        toast({ title: 'Account unlocked', description: `${u.email} can now log in again.` });
                                        if (onRefreshUsers) await onRefreshUsers();
                                      } catch (e: any) {
                                        toast({ title: 'Failed to unlock', description: e.message ?? 'Unlock failed', variant: 'destructive' });
                                      } finally {
                                        setUnlockingId(null);
                                      }
                                    }}
                                    className="cursor-pointer"
                                    disabled={unlockingId === u.id}
                                  >
                                    <div className="w-full">
                                      <div className="font-medium text-foreground">{unlockingId === u.id ? 'Unlocking…' : '🔓 Unlock account'}</div>
                                      <div className="text-caption text-muted-foreground mt-0.5">Clear login lockout immediately</div>
                                    </div>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setDeleteModal({ id: u.id, email: u.email, permanent: false })}
                                  className="cursor-pointer"
                                >
                                  <div className="w-full">
                                    <div className="font-medium text-foreground">Soft delete</div>
                                    <div className="text-caption text-muted-foreground mt-0.5">Can be restored later</div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteModal({ id: u.id, email: u.email, permanent: true })}
                                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <div className="w-full">
                                    <div className="font-bold">⚠️ Permanent delete</div>
                                    <div className="text-caption text-destructive mt-0.5 font-semibold">Cannot be undone!</div>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-neutral-50">
                    <TableCell colSpan={9} className="text-sm text-neutral-700">
                      <div aria-label={`Access explanation for customer ${u.id}`} className="space-y-1">
                        <p className="font-medium">{access.title}</p>
                        <p>{access.summary}</p>
                        <p><span className="font-medium">Next step:</span> {access.next}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                  </Fragment>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        {/* Loading overlay */}
        {(loading || deletedUsersLoading) && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-body-sm">Loading…</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="text-body-sm text-muted-foreground">
          Page {page} • {totalFiltered} total
        </div>
        <div className="flex flex-wrap gap-2">
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
          <div className={`bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border-2 rounded-2xl p-6 w-full max-w-md ${deleteModal.permanent ? 'border-destructive/30' : 'border-yellow-200'}`}>
            <h3 className={`font-semibold text-body-lg mb-2 ${deleteModal.permanent ? 'text-destructive' : ''}`}>
              {deleteModal.permanent ? '⚠️ Permanent Delete User' : 'Delete User'}
            </h3>
            <div className="space-y-4">
              {deleteModal.permanent ? (
                <div className="bg-destructive/10 border-2 border-destructive/20 rounded-lg p-4 space-y-2">
                  <p className="text-body-sm font-semibold text-destructive">
                    ⚠️ WARNING: PERMANENT DELETION ⚠️
                  </p>
                  <p className="text-body-sm text-destructive">
                    This will <strong>PERMANENTLY</strong> delete user <span className="font-mono font-semibold">{deleteModal.email}</span> and <strong>ALL</strong> their data from the database.
                  </p>
                  <ul className="text-caption text-destructive list-disc list-inside space-y-1 ml-2">
                    <li>User account will be completely removed</li>
                    <li>All mail items will be deleted</li>
                    <li>All subscriptions will be deleted</li>
                    <li>All business owner records will be deleted</li>
                    <li>This action <strong>CANNOT be undone</strong></li>
                  </ul>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-body-sm text-yellow-900">
                    This will <strong>soft-delete</strong> user <span className="font-mono">{deleteModal.email}</span>.
                  </p>
                  <p className="text-caption text-yellow-800 mt-1">
                    The user can be restored later. Their data will be hidden but not permanently removed.
                  </p>
                </div>
              )}
              <p className="text-body-sm text-muted-foreground">
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
                variant={deleteModal.permanent ? "destructive" : "secondary"}
                onClick={() => handleDeleteUser(deleteModal.id, deleteModal.permanent || false)}
                disabled={isMutating || deleteConfirm.trim().toLowerCase() !== deleteModal.email.toLowerCase()}
                className={deleteModal.permanent ? "bg-destructive hover:bg-destructive/90" : ""}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-body-lg mb-2">Restore Deleted User</h3>
            <p className="text-body-sm text-muted-foreground mb-4">
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
              <label className="flex items-center gap-2 text-body-sm">
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
          <div className="bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="font-semibold text-body-lg mb-1">Account &amp; plan status</h3>
              <p className="text-body-sm text-muted-foreground">
                Adjust billing/state enforcement for {planStatusModal.email}.
            </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="account-plan-status" className="text-body-sm font-medium">Plan status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                id="account-plan-status"
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
                  <p className="text-caption text-muted-foreground">{option.description}</p>
                ) : null;
                  })()}
                </div>

            <div className="space-y-2">
              <Label htmlFor="account-access-status">Account access</Label>
              <select id="account-access-status" className="w-full border rounded-md px-3 py-2 bg-white" value={accountStatusValue} onChange={e => setAccountStatusValue(e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending payment</option>
                {!["active", "suspended", "pending", "pending_payment"].includes(accountStatusValue) && <option value={accountStatusValue}>{accountStatusValue}</option>}
              </select>
              <p className="text-sm text-neutral-600">Changing the plan does not reactivate a suspended account. Set account access to Active only when you intend to restore access.</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-caption text-muted-foreground">
              <p>
                Mail access requires an active account, an active subscription and approved verification.
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
                    const updatePayload: { plan_status?: string; status?: string } = {};
                    if (planStatusValue !== (planStatusModal.plan_status ?? 'pending_payment')) {
                      updatePayload.plan_status = planStatusValue;
                    }
                    // Only an explicit access change may lift a suspension.
                    if (accountStatusValue !== (planStatusModal.status ?? 'pending')) {
                      updatePayload.status = accountStatusValue;
                    }

                    if (Object.keys(updatePayload).length === 0) {
                      setPlanStatusModal(null);
                      return;
                    }
                    const res = await adminApi.updateUser(planStatusModal.id, updatePayload);
                    if (!res.ok) {
                      throw new Error(res.error || 'update_failed');
                    }
                    toast({
                      title: 'Account and plan updated',
                      description: `Plan: ${formatPlanStatus(planStatusValue)}. Account access: ${accountStatusValue.replace(/_/g, ' ')}.`,
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
          <div className="bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="text-body-lg font-semibold mb-1">Update KYC status</h3>
              <p className="text-body-sm text-muted-foreground">
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
      {/* Create user modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="text-body-lg font-semibold mb-1">Create user</h3>
              <p className="text-body-sm text-muted-foreground">A password-reset email will be sent so they can set their own password.</p>
            </div>
            {createError && <p className="text-body-sm text-destructive">{createError}</p>}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cu-email">Email *</Label>
                <Input id="cu-email" type="email" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="cu-first">First name</Label>
                  <Input id="cu-first" value={createForm.first_name} onChange={(e) => setCreateForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jane" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="cu-last">Last name</Label>
                  <Input id="cu-last" value={createForm.last_name} onChange={(e) => setCreateForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-company">Company name</Label>
                <Input id="cu-company" value={createForm.company_name} onChange={(e) => setCreateForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Ltd" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-plan">Plan status</Label>
                <select id="cu-plan" className="w-full border rounded-md px-3 py-2 bg-background text-body-sm" value={createForm.plan_status} onChange={(e) => setCreateForm(f => ({ ...f, plan_status: e.target.value }))}>
                  {PLAN_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateModal(false)} disabled={isMutating}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!createForm.email.includes('@')) { setCreateError('Enter a valid email address.'); return; }
                  setIsMutating(true);
                  setCreateError('');
                  try {
                    const res = await fetch('/api/admin/users', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(createForm),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json.message || json.error || 'Failed to create user');
                    toast({ title: 'User created', description: `${createForm.email} has been created and will receive a password-reset email.` });
                    setCreateModal(false);
                    if (onRefreshUsers) await onRefreshUsers();
                  } catch (e: any) {
                    setCreateError(e.message ?? 'Unknown error');
                  } finally {
                    setIsMutating(false);
                  }
                }}
                disabled={isMutating}
              >
                {isMutating ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto border rounded-2xl p-6 w-full max-w-md space-y-5">
            <div>
              <h3 className="text-body-lg font-semibold mb-1">Edit profile</h3>
              <p className="text-body-sm text-muted-foreground">User #{editModal.id}</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ep-email">Email</Label>
                <Input id="ep-email" type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="ep-first">First name</Label>
                  <Input id="ep-first" value={editForm.first_name} onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="ep-last">Last name</Label>
                  <Input id="ep-last" value={editForm.last_name} onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ep-company">Company name</Label>
                <Input id="ep-company" value={editForm.company_name} onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModal(null)} disabled={isMutating}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!editModal) return;
                  setIsMutating(true);
                  try {
                    const payload: Record<string, string> = {};
                    if (editForm.email !== editModal.email) payload.email = editForm.email;
                    if (editForm.first_name !== (editModal.first_name ?? '')) payload.first_name = editForm.first_name;
                    if (editForm.last_name !== (editModal.last_name ?? '')) payload.last_name = editForm.last_name;
                    if (editForm.company_name !== (editModal.company_name ?? '')) payload.company_name = editForm.company_name;
                    if (Object.keys(payload).length === 0) { setEditModal(null); return; }
                    const res = await adminApi.updateUser(editModal.id, payload);
                    if (!res.ok) throw new Error(res.error || 'update_failed');
                    toast({ title: 'Profile updated', description: `${editForm.email} has been updated.` });
                    setEditModal(null);
                    if (onRefreshUsers) await onRefreshUsers();
                  } catch (e: any) {
                    toast({ title: 'Failed to update profile', description: e.message ?? 'Unknown error', variant: 'destructive' });
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
    </div>
  );
}