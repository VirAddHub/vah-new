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
import { MAIL_STATUS, type MailStatus, toCanonical, getNextStatuses } from '../../lib/mailStatus';
import { isRequested, isInProgress, isDone, uiStageFor } from '../../lib/forwardingStages';
import { updateForwardingByAction } from '../../lib/forwardingActions';

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

export default function CollaborativeForwardingBoard() {
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
  const allowedNext = (status: string): MailStatus[] => {
    try {
      const s = toCanonical(status);
      return getNextStatuses(s);
    } catch {
      return [];
    }
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

  // Lock a request for editing
  const lockRequest = async (requestId: number): Promise<boolean> => {
    if (!currentAdmin) return false;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/forwarding/requests/${requestId}/lock`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vah_jwt') || ''}`
        },
        body: JSON.stringify({
          admin_id: currentAdmin.id,
          admin_name: currentAdmin.name
        })
      });

      if (response.ok) {
        const lockData = await response.json();
        setLocks(prev => new Map(prev).set(requestId, {
          request_id: requestId,
          admin_id: currentAdmin.id,
          admin_name: currentAdmin.name,
          locked_at: Date.now()
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to lock request:', error);
      return false;
    }
  };

  // Unlock a request
  const unlockRequest = async (requestId: number): Promise<void> => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/forwarding/requests/${requestId}/unlock`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/forwarding/requests/${requestId}/force-unlock`, {
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

  // Load forwarding requests with real-time updates
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getForwardingRequests({ limit: 100, offset: 0 });
      if (data.ok && Array.isArray(data.data)) {
        setRows(data.data);
        
        // Update locks from server data
        const newLocks = new Map<number, AdminLock>();
        data.data.forEach((req: any) => {
          if (req.locked_by && req.locked_by_name && req.locked_at) {
            newLocks.set(req.id, {
              request_id: req.id,
              admin_id: req.locked_by,
              admin_name: req.locked_by_name,
              locked_at: req.locked_at
            });
          }
        });
        setLocks(newLocks);
      }
    } catch (error) {
      console.error('Failed to load forwarding requests:', error);
      setError('Failed to load forwarding requests');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time polling for updates
  useEffect(() => {
    load();
    
    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      load();
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [load]);

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

  // Categorize requests for display
  const categorizeRequests = (requests: ForwardingRequest[]) => {
    const filteredRequests = requests.filter(req =>
      req.to_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatFRId(req.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.address1.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const requested = filteredRequests.filter(r => isRequested(r.status));
    const inProgress = filteredRequests.filter(r => isInProgress(r.status));
    const done = filteredRequests.filter(r => isDone(r.status));
    const other = filteredRequests.filter(r =>
      !isRequested(r.status) && !isInProgress(r.status) && !isDone(r.status)
    );

    return { requested, inProgress, done, other };
  };

  // Update request status with conflict prevention
  const updateRequestStatus = async (requestId: number, newStatus: string) => {
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
        description: "Could not lock request for editing",
        variant: "destructive",
        durationMs: 3000,
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

      const response = await updateForwardingByAction(requestId.toString(), canonicalStatus);

      console.log(`[CollaborativeBoard] API response:`, response);

      if (response.ok) {
        // Success - keep the optimistic update, then refresh the page data
        console.log('Status updated successfully');
        toast({
          title: "Status Updated",
          description: `Request moved to ${uiStageFor(canonicalStatus)}`,
          durationMs: 3000,
        });
        
        // Refresh server components/data to get latest state
        router.refresh();
      } else {
        // Rollback on failure
        setRows(originalRows);
        console.error('Failed to update status:', response.error);

        // Simple error message - no complex auto-heal logic
        const payload = response.payload;
        let errorMsg = "Error updating status. Please try again.";
        
        if (payload?.error === "illegal_transition") {
          errorMsg = `Illegal: ${payload.from} → ${payload.to}. Allowed: ${payload.allowed?.join(", ") || "none"}`;
        } else if (payload?.message) {
          errorMsg = payload.message;
        } else if (response?.message) {
          errorMsg = response.message;
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
      const payload = error?.payload;
      let errorMsg = "Error updating status. Please try again.";
      
      if (payload?.error === "illegal_transition") {
        errorMsg = `Illegal: ${payload.from} → ${payload.to}. Allowed: ${payload.allowed?.join(", ") || "none"}`;
      } else if (payload?.message) {
        errorMsg = payload.message;
      } else if (error?.message) {
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
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'Requested': { variant: 'secondary', label: 'Requested' },
      'In Progress': { variant: 'default', label: 'In Progress' },
      'Done': { variant: 'outline', label: 'Done' },
    };

    const config = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant} data-testid="status-badge">{config.label}</Badge>;
  };

  // Categorize the requests
  const { requested, inProgress, done, other } = categorizeRequests(rows);

  // Render a request card with collaboration features
  const renderRequestCard = (request: ForwardingRequest, section: string) => {
    // Get allowed next statuses based on current status
    const allowedStatuses = allowedNext(request.status);
    const isBusy = updatingStatus === request.id;
    const isDisabled = isBusy || isAnyTransitionInProgress;
    const lockedByOther = isLockedByOther(request.id);
    const lockedByMe = isLockedByMe(request.id);
    const lockInfo = getLockInfo(request.id);

    return (
      <Card 
        key={request.id} 
        className={`mb-3 transition-all duration-200 ${
          lockedByOther ? 'opacity-60 border-orange-200 bg-orange-50' : 
          lockedByMe ? 'border-blue-200 bg-blue-50' : 
          'hover:shadow-md'
        }`}
        data-testid="forwarding-card" 
        data-status={uiStageFor(request.status)}
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
              {getStatusBadge(uiStageFor(request.status))}
              <div className="flex gap-1">
                {allowedStatuses.includes(MAIL_STATUS.Processing) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Processing)}
                    disabled={isDisabled || lockedByOther}
                    className={lockedByOther ? 'opacity-50' : ''}
                  >
                    {isBusy ? '...' : 'Start Processing'}
                  </Button>
                )}
                {allowedStatuses.includes(MAIL_STATUS.Dispatched) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Dispatched)}
                    disabled={isDisabled || lockedByOther}
                    className={lockedByOther ? 'opacity-50' : ''}
                  >
                    {isBusy ? '...' : 'Mark Dispatched'}
                  </Button>
                )}
                {allowedStatuses.includes(MAIL_STATUS.Delivered) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Delivered)}
                    disabled={isDisabled || lockedByOther}
                    className={lockedByOther ? 'opacity-50' : ''}
                  >
                    {isBusy ? '...' : 'Mark Delivered'}
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
            Real-time collaborative board • {currentAdmin?.name} is online
          </p>
        </div>
        <div className="flex items-center gap-2">
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
