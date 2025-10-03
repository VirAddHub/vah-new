"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/apiClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
  last_active_at?: number;
  last_login_at?: number;
  activity_status?: 'online' | 'offline';
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
    activity: string;
  }) => void;
}

export default function UsersSection({ users, loading, error, total, page, pageSize, onPageChange, isValidating, onFiltersChange }: UsersSectionProps) {
  const { toast } = useToast();

  // Search state
  const [q, setQ] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [planFilter, setPlanFilter] = useState<string>("__all__");
  const [kycFilter, setKycFilter] = useState<string>("__all__");
  const [activityFilter, setActivityFilter] = useState<string>("__all__");

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

  // Change plan modal state
  const [planModal, setPlanModal] = useState<null | { id: string | number; email: string; currentPlan?: string }>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  // Mutation state
  const [isMutating, setIsMutating] = useState(false);

  // Reset page when search changes
  useEffect(() => {
    onPageChange(1);
  }, [q, onPageChange]);

  // Call onFiltersChange when any filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        search: q,
        status: statusFilter === "__all__" ? "" : statusFilter,
        plan_id: planFilter === "__all__" ? "" : planFilter,
        kyc_status: kycFilter === "__all__" ? "" : kycFilter,
        activity: activityFilter === "__all__" ? "" : activityFilter,
      });
    }
  }, [q, statusFilter, planFilter, kycFilter, activityFilter, onFiltersChange]);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    const res = await adminApi.userStats();
    if (res.ok) setStats(res.data as any);
  }, []);

  useEffect(() => { loadUserStats(); }, [loadUserStats]);

  // Load available plans when plan modal opens
  useEffect(() => {
    if (planModal) {
      loadPlans();
    }
  }, [planModal]);

  const loadPlans = async () => {
    try {
      const res = await adminApi.getPlans();
      if (res.ok && res.data) {
        setAvailablePlans(res.data);
        if (planModal?.currentPlan) {
          setSelectedPlan(planModal.currentPlan);
        }
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  // Handle user deletion with double confirmation
  async function handleDeleteUser(id: string | number) {
    // First confirmation: Modal with email typing
    if (!deleteModal || !deleteConfirm.trim()) return;

    if (deleteConfirm.trim().toLowerCase() !== deleteModal.email.toLowerCase()) {
      toast({ title: 'Confirmation mismatch', description: 'Email does not match.', variant: 'destructive' });
      return;
    }

    // Second confirmation: Native browser confirm
    if (!window.confirm('This action cannot be undone. Are you absolutely sure you want to delete this user?')) {
      setDeleteModal(null);
      setDeleteConfirm('');
      return;
    }

    setIsMutating(true);

    try {
      const res = await adminApi.deleteUser(id);
      if (!res.ok) throw new Error(res.message || 'delete_failed');

      toast({ title: 'User deleted', description: `User ${deleteModal.email} has been deleted` });

      // Refresh data from parent
      await Promise.all([loadUserStats()]);
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
      if (!res.ok) throw new Error(res.message || 'restore_failed');

      toast({ title: 'User restored', description: `User restored with email ${restoreForm.email}` });

      // Refresh data from parent
      await Promise.all([loadUserStats()]);

      // Close modal
      setRestoreModal(null);
      setRestoreForm({ email: '', first_name: '', last_name: '', reactivate: true });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Restore failed', variant: 'destructive' });
    } finally {
      setIsMutating(false);
    }
  }

  // Server-side filtering - no local filtering needed
  // Just filter deleted users based on showDeleted toggle
  const displayUsers = useMemo(() => {
    if (!showDeleted) {
      return users.filter((u: any) => !u.deleted_at);
    }
    return users;
  }, [users, showDeleted]);

  // Pagination helpers - paginate the display users
  const totalFiltered = displayUsers.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = displayUsers.slice(startIndex, endIndex);
  const hasNext = useMemo(() => endIndex < totalFiltered, [endIndex, totalFiltered]);
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

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Activity:</label>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
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
            setActivityFilter("__all__");
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Total: {users.length}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showDeleted ? "default" : "outline"}
            onClick={() => setShowDeleted(!showDeleted)}
            size="sm"
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"}
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
      {loading && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading users…
        </div>
      )}
      {error && (
        <div className="text-center py-2">
          <div className="text-sm text-red-600 mb-2">{error}</div>
        </div>
      )}
      {!loading && !error && users.length === 0 && (
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
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    {error ?? "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${u.activity_status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs font-medium">
                            {u.activity_status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        {u.last_login_at && u.last_login_at > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Last login: {(() => {
                              try {
                                const date = new Date(u.last_login_at);
                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('en-GB', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch (e) {
                                return 'Invalid Date';
                              }
                            })()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never logged in</span>
                        )}
                      </div>
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
                      <Badge variant="outline">{u.kyc_status || "pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.created_at ? (() => {
                        try {
                          const date = new Date(u.created_at);
                          return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })() : "—"}
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
                              onClick={() => setPlanModal({ id: u.id, email: u.email, currentPlan: u.plan_status })}
                              disabled={isMutating}
                            >
                              Plan
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteModal({ id: u.id, email: u.email })}
                              disabled={isMutating}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Loading overlay */}
        {loading && (
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
            disabled={!hasPrev || loading}
            onClick={() => {
              const next = Math.max(1, page - 1);
              onPageChange(next);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext || loading}
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

      {/* Change Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Change User Plan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Change plan for {planModal.email}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Plan</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  <option value="">-- Select a plan --</option>
                  {availablePlans
                    .filter(p => p.active && !p.retired_at)
                    .map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - £{(plan.price_pence / 100).toFixed(2)}/{plan.interval}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setPlanModal(null);
                  setSelectedPlan('');
                }}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedPlan) {
                    toast({ title: "Error", description: "Please select a plan", variant: "destructive" });
                    return;
                  }

                  setIsMutating(true);
                  try {
                    // Update user's plan_id to change their plan
                    const res = await adminApi.updateUser(planModal.id, {
                      plan_id: parseInt(selectedPlan)
                    });

                    if (res.ok) {
                      toast({ title: "Success", description: "User plan updated" });
                      setPlanModal(null);
                      setSelectedPlan('');
                    } else {
                      toast({ title: "Error", description: res.message || "Failed to update plan", variant: "destructive" });
                    }
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to update plan", variant: "destructive" });
                  } finally {
                    setIsMutating(false);
                  }
                }}
                disabled={isMutating || !selectedPlan}
              >
                {isMutating ? 'Updating...' : 'Update Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}