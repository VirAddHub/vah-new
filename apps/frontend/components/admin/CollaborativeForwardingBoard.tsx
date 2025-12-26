"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useAdminHeartbeat } from "@/contexts/AdminHeartbeatContext";
import { adminApi } from "@/lib/services/http";
import { Search, Filter, User, Clock, Lock, CheckCircle, Trash2 } from "lucide-react";
import { formatFRId, formatDateUK } from "@/lib/utils/format";
import { useToast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import { FWD_LABEL } from '../../lib/forwardingStatus';
// Removed updateForwardingByAction import - now using direct status API

type Api<T> = { ok: boolean; data?: T; error?: string };
type ForwardingRequest = {
  id: number;
  user_id: number;
  mail_item_id: number;
  status: string;
  to_name: string;
  address1: string;
  city: string;
  postal: string;
  country: string;
  created_at: number;
  updated_at: number;
  dispatched_at?: number;
  delivered_at?: number;
  // User information
  user_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  // Real-time collaboration fields
  locked_by?: number;
  locked_by_name?: string;
  locked_at?: number;
};

type AdminLock = {
  request_id: number;
  admin_id: number;
  admin_name: string;
  locked_at: number;
};

interface CollaborativeForwardingBoardProps {
  onDataUpdate?: (requests: ForwardingRequest[]) => void;
}

export default function CollaborativeForwardingBoard({ onDataUpdate }: CollaborativeForwardingBoardProps = {}) {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  // This ensures the same number of hooks are called on every render
  
  const { toast } = useToast();
  const router = useRouter();
  
  // State hooks - all called unconditionally
  const [rows, setRows] = useState<ForwardingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [isAnyTransitionInProgress, setIsAnyTransitionInProgress] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<number | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: number; name: string } | null>(null);
  const [locks, setLocks] = useState<Map<number, AdminLock>>(new Map());
  
  // Context hooks - called unconditionally (will throw if context missing, which is expected)
  const { registerPolling, unregisterPolling } = useAdminHeartbeat();
  
  // Refs - called unconditionally
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Get current admin info
  useEffect(() => {
    const storedUser = localStorage.getItem('vah_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentAdmin({
          id: userData.id,
          name: userData.first_name || userData.email || 'Admin'
        });
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
  }, []);

  // Helper to get allowed next statuses
  // Simple status transitions for 3-stage Kanban - using backend status values
  const getNextStatus = (status: string): string | null => {
    if (status === 'Requested') return 'Processing';
    if (status === 'Processing') return 'Dispatched';
    return null; // Dispatched/Delivered are final
  };

  // Check if request is locked by another admin
  const isLockedByOther = (requestId: number): boolean => {
    const lock = locks.get(requestId);
    return lock ? lock.admin_id !== currentAdmin?.id : false;
  };

  // Check if request is locked by current admin
  const isLockedByMe = (requestId: number): boolean => {
    const lock = locks.get(requestId);
    return lock ? lock.admin_id === currentAdmin?.id : false;
  };

  // Get lock info for a request
  const getLockInfo = (requestId: number): AdminLock | null => {
    return locks.get(requestId) || null;
  };

  // Lock a request for editing (DISABLED - no locking needed for single admin)
  const lockRequest = async (requestId: number): Promise<boolean> => {
    // Skip locking for now - return true to allow status updates
    return true;
  };

  // Unlock a request
  const unlockRequest = async (requestId: number): Promise<void> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://vah-api-staging.onrender.com';
      await fetch(`${API_BASE}/api/admin/forwarding/requests/${requestId}/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        }
      });

      setLocks(prev => {
        const newLocks = new Map(prev);
        newLocks.delete(requestId);
        return newLocks;
      });
    } catch (error) {
      console.error('Failed to unlock request:', error);
    }
  };

  // Force unlock a request (admin override)
  const forceUnlockRequest = async (requestId: number): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://vah-api-staging.onrender.com';
      const response = await fetch(`${API_BASE}/api/admin/forwarding/requests/${requestId}/force-unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        }
      });

      if (response.ok) {
        setLocks(prev => {
          const newLocks = new Map(prev);
          newLocks.delete(requestId);
          return newLocks;
        });

        toast({
          title: "Force Unlocked",
          description: "Request is now available for editing",
          durationMs: 3000,
        });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: "Force Unlock Failed",
          description: errorData.message || "Could not force unlock request",
          variant: "destructive",
          durationMs: 3000,
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to force unlock request:', error);
      toast({
        title: "Force Unlock Failed",
        description: "Network error occurred",
        variant: "destructive",
        durationMs: 3000,
      });
      return false;
    }
  };

  // Load locks from server
  const loadLocks = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://vah-api-staging.onrender.com';
      const response = await fetch(`${API_BASE}/api/admin/forwarding/locks`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && Array.isArray(data.locks)) {
          const newLocks = new Map<number, AdminLock>();
          data.locks.forEach((lock: any) => {
            newLocks.set(lock.request_id, {
              request_id: lock.request_id,
              admin_id: lock.admin_id,
              admin_name: lock.admin_name,
              locked_at: lock.locked_at
            });
          });
          setLocks(newLocks);
        }
      }
    } catch (error) {
      console.error('Failed to load locks:', error);
    }
  }, []);

  // Load forwarding requests with real-time updates - WITH DEDUPLICATION
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getForwardingRequests({ limit: 100, offset: 0 });
      if (data.ok && Array.isArray(data.data)) {
        setRows(data.data);

        // Notify parent component of data update
        if (onDataUpdate) {
          onDataUpdate(data.data);
        }

        // Load locks separately to ensure we have the latest lock information
        await loadLocks();
      }
    } catch (error) {
      console.error('Failed to load forwarding requests:', error);
      // Don't show error for rate limiting - just log it
      if (error instanceof Error && error.message.includes('429')) {
        console.log('Rate limited - will retry on next poll');
        return;
      }
      setError('Failed to load forwarding requests');
    } finally {
      setLoading(false);
    }
  }, [onDataUpdate, loadLocks]);

  // Real-time polling for updates - REDUCED FREQUENCY WITH DEDUPLICATION
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let mounted = true;

    // Initial load
    load().catch(err => {
      if (mounted) {
        console.error('Initial load failed:', err);
      }
    });

    // Set up polling for real-time updates - DRAMATICALLY REDUCED FREQUENCY
    pollInterval = setInterval(() => {
      if (mounted) {
        load().catch(err => {
          console.error('Polling load failed:', err);
        });
      }
    }, 120000); // Poll every 2 minutes to prevent 429 errors

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - load is stable via useCallback dependencies

  // Auto-unlock requests when component unmounts
  useEffect(() => {
    const locksRef = locks;
    const currentAdminRef = currentAdmin;
    
    return () => {
      // Unlock all requests locked by current admin
      locksRef.forEach((lock, requestId) => {
        if (lock.admin_id === currentAdminRef?.id) {
          // Fire and forget - don't await in cleanup
          unlockRequest(requestId).catch(err => {
            console.error('Failed to unlock request on unmount:', err);
          });
        }
      });
    };
  }, [locks, currentAdmin]);

  // Categorize requests for display - SIMPLIFIED 3-STAGE KANBAN
  const categorizeRequests = (requests: ForwardingRequest[]) => {
    const filteredRequests = requests.filter(req => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (req.user_name || '').toLowerCase().includes(searchLower) ||
        (req.first_name || '').toLowerCase().includes(searchLower) ||
        (req.last_name || '').toLowerCase().includes(searchLower) ||
        (req.email || '').toLowerCase().includes(searchLower) ||
        req.to_name.toLowerCase().includes(searchLower) ||
        formatFRId(req.id).toLowerCase().includes(searchLower) ||
        (req.address1 || '').toLowerCase().includes(searchLower)
      );
    });

    // Simple 3-stage categorization - map all possible status values to 3 stages
    const requested = filteredRequests.filter(r => {
      const status = r.status?.toLowerCase();
      return status === 'requested' || status === 'request';
    });

    const inProgress = filteredRequests.filter(r => {
      const status = r.status?.toLowerCase();
      return status === 'in_progress' || status === 'processing' || status === 'in progress' ||
        status === 'reviewed' || status === 'review';
    });

    const done = filteredRequests.filter(r => {
      const status = r.status?.toLowerCase();
      return status === 'dispatched' || status === 'delivered' || status === 'shipped' ||
        status === 'completed' || status === 'complete';
    });

    return { requested, inProgress, done, other: [] };
  };

  // Update request status with conflict prevention
  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    // Guard against double clicks - if already updating this or any request, bail
    if (updatingStatus !== null || isAnyTransitionInProgress) {
      console.log('[CollaborativeBoard] Update already in progress, ignoring click');
      return;
    }

    // Check if locked by another admin
    if (isLockedByOther(requestId)) {
      const lockInfo = getLockInfo(requestId);
      toast({
        title: "Request Locked",
        description: `${lockInfo?.admin_name} is currently working on this request`,
        variant: "destructive",
        durationMs: 3000,
      });
      return;
    }

    // Lock the request
    const locked = await lockRequest(requestId);
    if (!locked) {
      toast({
        title: "Failed to Lock",
        description: "Could not lock request for editing. It may be locked by another admin.",
        variant: "destructive",
        durationMs: 5000,
      });
      return;
    }

    setUpdatingStatus(requestId);
    setIsAnyTransitionInProgress(true);

    // Store original state for rollback
    const originalRows = [...rows];

    // Use the status directly - it should already be canonical
    const canonicalStatus = newStatus;

    // Optimistically update the local state with canonical status
    setRows(prevRows =>
      prevRows.map(req =>
        req.id === requestId
          ? { ...req, status: canonicalStatus, updated_at: Date.now() }
          : req
      )
    );

    try {
      console.log(`[CollaborativeBoard] Updating request ${requestId} to UI status "${newStatus}" (canonical: "${canonicalStatus}")`);

      // Use the new status-based API instead of action-based API
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com';
      const response = await fetch(`${API_BASE}/api/admin/forwarding/requests/${requestId}/status`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        },
        body: JSON.stringify({ status: canonicalStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log(`[CollaborativeBoard] API response:`, result);

      if (result.ok) {
        // Success - keep the optimistic update, then refresh the page data
        console.log('Status updated successfully');
        toast({
          title: "Status Updated",
          description: `Request moved to ${FWD_LABEL[canonicalStatus as keyof typeof FWD_LABEL] || canonicalStatus}`,
          durationMs: 3000,
        });

        // Notify parent component of data update
        if (onDataUpdate) {
          const updatedRows = rows.map(req =>
            req.id === requestId
              ? { ...req, status: canonicalStatus, updated_at: Date.now() }
              : req
          );
          onDataUpdate(updatedRows);
        }

        // Refresh server components/data to get latest state
        router.refresh();
      } else {
        // Rollback on failure
        setRows(originalRows);
        console.error('Failed to update status:', result?.error);

        // Simple error message - no complex auto-heal logic
        const payload = result;
        let errorMsg = "Error updating status. Please try again.";

        if (payload?.error === "illegal_transition") {
          errorMsg = `Illegal: ${payload.from} → ${payload.to}. Allowed: ${payload.allowed?.join(", ") || "none"}`;
        } else if (payload?.message) {
          errorMsg = payload.message;
        }

        toast({
          title: "Status Update Error",
          description: errorMsg,
          variant: "destructive",
          durationMs: 5000,
        });
      }
    } catch (error: any) {
      // Rollback on error
      setRows(originalRows);
      console.error('Error updating status:', error);

      // Simple error message - no complex auto-heal logic
      let errorMsg = "Error updating status. Please try again.";

      if (error?.message) {
        errorMsg = error.message;
      }

      toast({
        title: "Status Update Error",
        description: errorMsg,
        variant: "destructive",
        durationMs: 5000,
      });
    } finally {
      setUpdatingStatus(null);
      setIsAnyTransitionInProgress(false);

      // Unlock the request after a short delay
      setTimeout(() => {
        unlockRequest(requestId);
      }, 2000);
    }
  };

  // Delete a forwarding request (only for done requests)
  const deleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this forwarding request? This action cannot be undone.')) {
      return;
    }

    setDeletingRequest(requestId);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com';
      const response = await fetch(`${API_BASE}/api/admin/forwarding/requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Remove from local state
      setRows(prevRows => prevRows.filter(req => req.id !== requestId));

      toast({
        title: "Request Deleted",
        description: "Forwarding request has been deleted successfully",
        durationMs: 3000,
      });

      // Notify parent component
      if (onDataUpdate) {
        const updatedRows = rows.filter(req => req.id !== requestId);
        onDataUpdate(updatedRows);
      }
    } catch (error: any) {
      console.error('Failed to delete request:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete forwarding request",
        variant: "destructive",
        durationMs: 5000,
      });
    } finally {
      setDeletingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'requested' || normalizedStatus === 'request') {
      return <Badge variant="secondary">{FWD_LABEL.requested}</Badge>;
    }
    if (normalizedStatus === 'in_progress' || normalizedStatus === 'processing' ||
      normalizedStatus === 'in progress' || normalizedStatus === 'reviewed' ||
      normalizedStatus === 'review') {
      return <Badge variant="default">{FWD_LABEL.in_progress}</Badge>;
    }
    if (normalizedStatus === 'dispatched' || normalizedStatus === 'delivered' ||
      normalizedStatus === 'shipped' || normalizedStatus === 'completed' ||
      normalizedStatus === 'complete') {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">{FWD_LABEL.dispatched}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
  };

  // Categorize the requests
  const { requested, inProgress, done, other } = categorizeRequests(rows);

  // Render a request card with collaboration features
  const renderRequestCard = (request: ForwardingRequest, section: string) => {
    // Get allowed next statuses based on current status
    const isBusy = updatingStatus === request.id;
    const isDisabled = isBusy || isAnyTransitionInProgress;
    const lockedByOther = isLockedByOther(request.id);
    const lockedByMe = isLockedByMe(request.id);
    const lockInfo = getLockInfo(request.id);

    const isDone = section === 'done';
    const isDeleting = deletingRequest === request.id;

    return (
      <Card
        key={request.id}
        className={`mb-3 transition-all duration-200 ${lockedByOther ? 'opacity-60 border-orange-200 bg-orange-50' :
            lockedByMe ? 'border-blue-200 bg-blue-50' :
              isDone ? 'border-green-100 bg-green-50/30' :
                'border-border hover:shadow-md hover:border-primary/20'
          }`}
        data-testid="forwarding-card"
        data-status={request.status}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header with ID and metadata */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                  {formatFRId(request.id)}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Mail #{request.mail_item_id}</span>
                  <span>•</span>
                  <span>User #{request.user_id}</span>
                  <span>•</span>
                  <span>{formatDateUK(request.created_at)}</span>
                </div>
              </div>

              {/* User name */}
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1">User:</div>
                <div className="font-medium text-sm text-foreground">
                  {request.user_name || 
                   (request.first_name || request.last_name 
                     ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                     : request.email || `User #${request.user_id}`)}
                </div>
              </div>

              {/* Recipient info */}
              <div className="space-y-1 mb-3">
                <div className="text-xs text-muted-foreground mb-1">Forwarding to:</div>
                <div className="font-medium text-sm text-foreground">
                  {request.to_name || 'No name'}
                </div>
                {request.address1 && (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {request.address1}
                    {request.city && `, ${request.city} ${request.postal} ${request.country}`}
                  </div>
                )}
              </div>

              {/* Lock indicator */}
              {lockInfo && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {lockedByMe ? (
                      <>
                        <Lock className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-600">You are editing</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-600">{lockInfo.admin_name} is editing</span>
                      </>
                    )}
                  </div>

                  {/* Force unlock button for locked requests */}
                  {lockedByOther && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Force unlock this request from ${lockInfo.admin_name}?`)) {
                          forceUnlockRequest(request.id);
                        }
                      }}
                    >
                      Force Unlock
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {getStatusBadge(request.status)}
              <div className="flex gap-1.5">
                {/* Action buttons */}
                {(request.status?.toLowerCase() === 'requested' || request.status?.toLowerCase() === 'request') && (
                  <Button
                    size="sm"
                    onClick={() => updateRequestStatus(request.id, 'in_progress')}
                    disabled={isDisabled || lockedByOther}
                    className={lockedByOther ? 'opacity-50' : ''}
                  >
                    {isBusy ? '...' : 'Start'}
                  </Button>
                )}
                {(request.status?.toLowerCase() === 'in_progress' || request.status?.toLowerCase() === 'processing' ||
                  request.status?.toLowerCase() === 'in progress' || request.status?.toLowerCase() === 'reviewed' ||
                  request.status?.toLowerCase() === 'review') && (
                    <Button
                      size="sm"
                      onClick={() => updateRequestStatus(request.id, 'dispatched')}
                      disabled={isDisabled || lockedByOther}
                      className={lockedByOther ? 'opacity-50' : 'bg-green-600 hover:bg-green-700 text-white'}
                    >
                      {isBusy ? '...' : 'Done'}
                    </Button>
                  )}

                {/* Delete button for done requests */}
                {isDone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRequest(request.id);
                    }}
                    disabled={isDeleting}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    {isDeleting ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                      </span>
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading forwarding requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Forwarding Requests</h2>
          <p className="text-muted-foreground">
            Updates every 2 minutes • {currentAdmin?.name} is online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Status columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Requested */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Requested</h3>
            <Badge variant="secondary">{requested.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {requested.map(request => renderRequestCard(request, 'requested'))}
          </div>
        </div>

        {/* In Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">In Progress</h3>
            <Badge variant="default">{inProgress.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {inProgress.map(request => renderRequestCard(request, 'inProgress'))}
          </div>
        </div>

        {/* Done */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-muted-foreground">Done</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {done.length}
              </Badge>
            </div>
            {done.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Completed requests can be deleted to keep the board clean
              </p>
            )}
          </div>
          <div className="space-y-3 min-h-[200px]">
            {done.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No completed requests
              </div>
            ) : (
              done.map(request => renderRequestCard(request, 'done'))
            )}
          </div>
        </div>
      </div>

      {/* Other statuses */}
      {other.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Other</h3>
            <Badge variant="destructive">{other.length}</Badge>
          </div>
          <div className="space-y-3">
            {other.map(request => renderRequestCard(request, 'other'))}
          </div>
        </div>
      )}

      {/* Real-time status indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Real-time updates active • Last sync: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
