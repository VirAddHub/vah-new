"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAdminHeartbeat } from "@/contexts/AdminHeartbeatContext";
import { adminApi } from "@/lib/services/http";
import { Search, Filter } from "lucide-react";
import { formatFRId, formatDateUK } from "@/lib/utils/format";
import { useToast } from "../ui/use-toast";
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
};

export default function StableForwardingTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ForwardingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const { registerPolling, unregisterPolling } = useAdminHeartbeat();

  // Helper to get allowed next statuses
  const allowedNext = (status: string): MailStatus[] => {
    try {
      const s = toCanonical(status);
      return getNextStatuses(s);
    } catch {
      return [];
    }
  };

  // Helper to check if a specific transition is allowed
  const isTransitionAllowed = (currentStatus: string, targetStatus: string): boolean => {
    try {
      const current = toCanonical(currentStatus);
      const target = toCanonical(targetStatus);
      return getNextStatuses(current).includes(target);
    } catch {
      return false;
    }
  };

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getForwardingRequests({
        limit: 100, // Increased to get more data for filtering
        offset: 0,
        q: searchQuery || undefined
      });
      if (mountedRef.current) {
        if (data.ok && Array.isArray(data.data)) {
          console.log('Forwarding requests data:', data.data);
          console.log('First row sample:', data.data[0]);
          setRows(data.data);
        } else {
          setError(data.error || "Failed to load forwarding requests");
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError" && mountedRef.current) setError(e.message ?? "Failed");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [searchQuery]);

  // Use shared heartbeat instead of individual polling
  useEffect(() => {
    load(); // initial load
    registerPolling('forwarding-requests', load);

    // Abort on page unload/navigation
    const handleBeforeUnload = () => {
      abortRef.current?.abort();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unregisterPolling('forwarding-requests');
      abortRef.current?.abort();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [load, registerPolling, unregisterPolling]);

  // Categorize requests into 3 main sections
  const categorizeRequests = (requests: ForwardingRequest[]) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Apply search filter first
    const filteredRequests = searchQuery
      ? requests.filter(r => {
        const searchLower = searchQuery.toLowerCase();
        return (
          formatFRId(r.id).toLowerCase().includes(searchLower) ||
          r.mail_item_id.toString().includes(searchLower) ||
          r.user_id.toString().includes(searchLower) ||
          (r.to_name && r.to_name.toLowerCase().includes(searchLower)) ||
          (r.address1 && r.address1.toLowerCase().includes(searchLower)) ||
          (r.city && r.city.toLowerCase().includes(searchLower)) ||
          (r.postal && r.postal.toLowerCase().includes(searchLower)) ||
          (r.country && r.country.toLowerCase().includes(searchLower)) ||
          r.status.toLowerCase().includes(searchLower)
        );
      })
      : requests;

    // Use canonical status helpers for filtering
    const requested = filteredRequests.filter(r => isRequested(r.status));
    const inProgress = filteredRequests.filter(r => isInProgress(r.status));
    const done = filteredRequests.filter(r => isDone(r.status));

    // Defensive "Other" column for any items that don't fit the main categories
    const other = filteredRequests.filter(r =>
      !isRequested(r.status) && !isInProgress(r.status) && !isDone(r.status)
    );

    return { requested, inProgress, done, other };
  };

  // Update request status with optimistic updates
  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    setUpdatingStatus(requestId);

    // Store original state for rollback
    const originalRows = [...rows];

    // Convert UI status to canonical status for API call
    const canonicalStatus = newStatus === 'In Progress' ? MAIL_STATUS.Processing :
      newStatus === 'Done' ? MAIL_STATUS.Delivered :
        newStatus; // Already canonical if passed as MAIL_STATUS constant

    // Optimistically update the local state with canonical status
    setRows(prevRows =>
      prevRows.map(req =>
        req.id === requestId
          ? { ...req, status: canonicalStatus, updated_at: Date.now() }
          : req
      )
    );

    try {
      console.log(`[StableForwardingTable] Updating request ${requestId} to UI status "${newStatus}" (canonical: "${canonicalStatus}")`);
      console.log(`[StableForwardingTable] Current request status from DB:`, originalRows.find(r => r.id === requestId)?.status);
      console.log(`[StableForwardingTable] Request details:`, originalRows.find(r => r.id === requestId));

      const response = await updateForwardingByAction(requestId.toString(), canonicalStatus);

      console.log(`[StableForwardingTable] API response:`, response);

      if (response.ok) {
        // Success - keep the optimistic update, but also refresh data to ensure consistency
        console.log('Status updated successfully');
        toast({
          title: "Status Updated",
          description: `Request moved to ${uiStageFor(canonicalStatus)}`,
          durationMs: 3000,
        });

        // Refresh data to ensure we have the latest state from the server
        await loadForwardingRequests();
      } else {
        // Rollback on failure
        setRows(originalRows);
        console.error('Failed to update status:', response.error);

        // Try to surface the server's strict-guard payload if present
        let errorMsg = "Failed to update status. Please try again.";
        if (response.error === "illegal_transition") {
          errorMsg = `Illegal transition: ${response.from} → ${response.to}. Allowed: ${response.allowed?.join(", ")}`;
        } else if (response.message) {
          errorMsg = response.message;
        }

        toast({
          title: "Status Update Failed",
          description: errorMsg,
          variant: "destructive",
          durationMs: 5000,
        });
      }
    } catch (error: any) {
      // Rollback on error
      setRows(originalRows);
      console.error('Error updating status:', error);

      // Try auto-heal for illegal transitions
      const payload = error?.payload;
      if (payload?.error === "illegal_transition" &&
        payload?.from === MAIL_STATUS.Requested &&
        payload?.to === MAIL_STATUS.Dispatched &&
        Array.isArray(payload?.allowed) &&
        payload.allowed.includes(MAIL_STATUS.Processing)) {

        console.log('[Auto-heal] Attempting to auto-advance: Requested → Processing → Dispatched');

        try {
          // Step 1: Move to Processing
          await updateForwardingByAction(requestId.toString(), MAIL_STATUS.Processing);
          setRows(prevRows =>
            prevRows.map(req =>
              req.id === requestId
                ? { ...req, status: MAIL_STATUS.Processing, updated_at: Date.now() }
                : req
            )
          );

          // Step 2: Move to Dispatched
          await updateForwardingByAction(requestId.toString(), MAIL_STATUS.Dispatched);
          setRows(prevRows =>
            prevRows.map(req =>
              req.id === requestId
                ? { ...req, status: MAIL_STATUS.Dispatched, updated_at: Date.now() }
                : req
            )
          );

          toast({
            title: "Auto-Advanced",
            description: "Processing → Dispatched",
            durationMs: 3000,
          });

          // Refresh data to ensure consistency
          await loadForwardingRequests();
          return; // Success, exit early

        } catch (autoHealError: any) {
          console.error('[Auto-heal] Failed:', autoHealError);
          toast({
            title: "Auto-Heal Failed",
            description: "Couldn't auto-advance. Please try again.",
            variant: "destructive",
            durationMs: 5000,
          });
          return;
        }
      }

      // Fallback for other errors
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

  // Render a request card
  const renderRequestCard = (request: ForwardingRequest, section: string) => {
    // Get allowed next statuses based on current status
    const allowedStatuses = allowedNext(request.status);
    const isBusy = updatingStatus === request.id;

    return (
      <Card key={request.id} className="mb-3" data-testid="forwarding-card" data-status={uiStageFor(request.status)}>
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
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(uiStageFor(request.status))}
              <div className="flex gap-1">
                {allowedStatuses.includes(MAIL_STATUS.Processing) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Processing)}
                    disabled={isBusy}
                  >
                    {isBusy ? '...' : 'Start Processing'}
                  </Button>
                )}
                {allowedStatuses.includes(MAIL_STATUS.Dispatched) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Dispatched)}
                    disabled={isBusy}
                  >
                    {isBusy ? '...' : 'Mark Dispatched'}
                  </Button>
                )}
                {allowedStatuses.includes(MAIL_STATUS.Delivered) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, MAIL_STATUS.Delivered)}
                    disabled={isBusy}
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

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Forwarding Requests</CardTitle>
            <Button onClick={load} disabled={loading} variant="outline" size="sm">
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 mb-4">{error}</p>}

          {/* Search Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Three Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requested Section */}
        <Card data-testid="forwarding-column" data-stage="Requested">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Requested</Badge>
              <span className="text-sm text-muted-foreground">({requested.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requested.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No requested items</p>
            ) : (
              requested.map(request => renderRequestCard(request, 'requested'))
            )}
          </CardContent>
        </Card>

        {/* In Progress Section */}
        <Card data-testid="forwarding-column" data-stage="In Progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default">In Progress</Badge>
              <span className="text-sm text-muted-foreground">({inProgress.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inProgress.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No items in progress</p>
            ) : (
              inProgress.map(request => renderRequestCard(request, 'inProgress'))
            )}
          </CardContent>
        </Card>

        {/* Done Section */}
        <Card data-testid="forwarding-column" data-stage="Done">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline">Done</Badge>
              <span className="text-sm text-muted-foreground">({done.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {done.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No completed items</p>
            ) : (
              done.map(request => renderRequestCard(request, 'done'))
            )}
          </CardContent>
        </Card>

        {/* Other Section - Defensive column for unexpected statuses */}
        {other.length > 0 && (
          <Card className="lg:col-span-3" data-testid="forwarding-column" data-stage="Other">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="destructive">Other</Badge>
                <span className="text-sm text-muted-foreground">({other.length})</span>
                <span className="text-xs text-muted-foreground">Unexpected statuses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {other.map(request => (
                <div key={request.id} className="mb-2 p-2 border border-dashed border-red-200 rounded" data-testid="forwarding-card" data-status="Other">
                  <div className="text-sm">
                    <span className="font-mono">{formatFRId(request.id)}</span>
                    <span className="ml-2 text-red-600" data-testid="status-text">Status: "{request.status}"</span>
                    <span className="ml-2 text-muted-foreground">User #{request.user_id}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
