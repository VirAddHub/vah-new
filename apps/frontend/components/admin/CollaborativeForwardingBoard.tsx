"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useAdminHeartbeat } from "@/contexts/AdminHeartbeatContext";
import { adminApi } from "@/lib/services/http";
import { Search, Filter, User, Clock, Lock, CheckCircle } from "lucide-react";
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
  const { toast } = useToast();
  const [rows, setRows] = useState<ForwardingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [isAnyTransitionInProgress, setIsAnyTransitionInProgress] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: number; name: string } | null>(null);
  const [locks, setLocks] = useState<Map<number, AdminLock>>(new Map());
  const { registerPolling, unregisterPolling } = useAdminHeartbeat();
  const router = useRouter();
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
    load();

    // Set up polling for real-time updates - DRAMATICALLY REDUCED FREQUENCY
    const pollInterval = setInterval(() => {
      load();
    }, 120000); // Poll every 2 minutes to prevent 429 errors

    return () => {
      clearInterval(pollInterval);
    };
  }, []); // Remove load from dependencies to prevent infinite loop

  // Auto-unlock requests when component unmounts
  useEffect(() => {
    return () => {
      // Unlock all requests locked by current admin
      locks.forEach((lock, requestId) => {
        if (lock.admin_id === currentAdmin?.id) {
          unlockRequest(requestId);
        }
      });
    };
  }, [locks, currentAdmin]);

  // Categorize requests for display - SIMPLIFIED 3-STAGE KANBAN
  const categorizeRequests = (requests: ForwardingRequest[]) => {
    const filteredRequests = requests.filter(req =>
      req.to_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatFRId(req.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.address1.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    return (
      <Card
        key={request.id}
        className={`mb-3 transition-all duration-200 ${lockedByOther ? 'opacity-60 border-orange-200 bg-orange-50' :
          lockedByMe ? 'border-blue-200 bg-blue-50' :
            'hover:shadow-md'
          }`}
        data-testid="forwarding-card"
        data-status={request.status}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <span className="font-mono text-sm font-medium">{formatFRId(request.id)}</span>
                <span className="text-sm text-muted-foreground">Mail #{request.mail_item_id}</span>
                <span className="text-sm text-muted-foreground">User #{request.user_id}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDateUK(request.created_at)}
                </span>
              </div>
              <div className="text-sm">
                <div className="font-medium">{request.to_name || 'No name'}</div>
                {request.address1 && (
                  <div className="text-muted-foreground">
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

            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              <div className="flex gap-1">
                {/* Simple 2-button system - handle all possible status values */}
                {(request.status?.toLowerCase() === 'requested' || request.status?.toLowerCase() === 'request') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, 'in_progress')}
                    disabled={isDisabled || lockedByOther}
                    className={lockedByOther ? 'opacity-50' : ''}
                  >
                    {isBusy ? '...' : 'Start Processing'}
                  </Button>
                )}
                {(request.status?.toLowerCase() === 'in_progress' || request.status?.toLowerCase() === 'processing' ||
                  request.status?.toLowerCase() === 'in progress' || request.status?.toLowerCase() === 'reviewed' ||
                  request.status?.toLowerCase() === 'review') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRequestStatus(request.id, 'dispatched')}
                      disabled={isDisabled || lockedByOther}
                      className={lockedByOther ? 'opacity-50' : ''}
                    >
                      {isBusy ? '...' : 'Mark Done'}
                    </Button>
                  )}
                {(request.status?.toLowerCase() === 'dispatched' || request.status?.toLowerCase() === 'delivered' ||
                  request.status?.toLowerCase() === 'shipped' || request.status?.toLowerCase() === 'completed' ||
                  request.status?.toLowerCase() === 'complete') && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled
                    >
                      Done ✓
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
            <h3 className="font-semibold text-lg">Done</h3>
            <Badge variant="outline">{done.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {done.map(request => renderRequestCard(request, 'done'))}
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
