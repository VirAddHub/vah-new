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

    // Map backend statuses to frontend sections
    const requested = filteredRequests.filter(r => r.status === 'Requested' || r.status === 'Reviewed');
    const inProgress = filteredRequests.filter(r => r.status === 'Processing');
    const done = filteredRequests.filter(r => {
      if (r.status === 'Dispatched' || r.status === 'Delivered') {
        // Debug logging to see what's happening
        console.log('Done filter check:', {
          id: r.id,
          status: r.status,
          dispatched_at: r.dispatched_at,
          dispatched_at_type: typeof r.dispatched_at,
          thirtyDaysAgo,
          now
        });
        
        // Convert dispatched_at to number if it's a string
        let dispatchedAt = r.dispatched_at;
        if (typeof dispatchedAt === 'string') {
          dispatchedAt = parseInt(dispatchedAt, 10);
        }
        
        // Show all dispatched/delivered items regardless of age for now
        // TODO: Re-enable 30-day filter once we confirm the timestamp format
        return true;
        
        // Original logic (commented out for debugging):
        // return dispatchedAt ? dispatchedAt > thirtyDaysAgo : false;
      }
      return false;
    });

    return { requested, inProgress, done };
  };

  // Update request status with optimistic updates
  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    setUpdatingStatus(requestId);

    // Store original state for rollback
    const originalRows = [...rows];

    // Optimistically update the local state
    setRows(prevRows =>
      prevRows.map(req =>
        req.id === requestId
          ? { ...req, status: newStatus, updated_at: Date.now() }
          : req
      )
    );

    try {
      const response = await adminApi.updateForwardingRequest(requestId, {
        action: getActionFromStatus(newStatus)
      });

      if (response.ok) {
        // Success - keep the optimistic update, no need to reload
        console.log('Status updated successfully');
      } else {
        // Rollback on failure
        setRows(originalRows);
        console.error('Failed to update status:', response.error);
        toast({
          title: "Status Update Failed",
          description: "Failed to update status. Please try again.",
          variant: "destructive",
          durationMs: 5000,
        });
      }
    } catch (error) {
      // Rollback on error
      setRows(originalRows);
      console.error('Error updating status:', error);
      toast({
        title: "Status Update Error",
        description: "Error updating status. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Map simplified status to API action
  const getActionFromStatus = (status: string) => {
    switch (status) {
      case 'In Progress': return 'start_processing';
      case 'Done': return 'mark_dispatched';
      default: return 'start_processing';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'Requested': { variant: 'secondary', label: 'Requested' },
      'In Progress': { variant: 'default', label: 'In Progress' },
      'Done': { variant: 'outline', label: 'Done' },
    };

    const config = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Categorize the requests
  const { requested, inProgress, done } = categorizeRequests(rows);

  // Render a request card
  const renderRequestCard = (request: ForwardingRequest, section: string) => {
    // Determine what actions are available based on current status
    const canMoveToInProgress = section === 'requested' && (request.status === 'Requested' || request.status === 'Reviewed');
    const canMoveToDone = section === 'inProgress' && request.status === 'Processing';

    return (
      <Card key={request.id} className="mb-3">
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
              {getStatusBadge(section === 'requested' ? 'Requested' : section === 'inProgress' ? 'In Progress' : 'Done')}
              <div className="flex gap-1">
                {canMoveToInProgress && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, 'In Progress')}
                    disabled={updatingStatus === request.id}
                  >
                    {updatingStatus === request.id ? '...' : 'Start Processing'}
                  </Button>
                )}
                {canMoveToDone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, 'Done')}
                    disabled={updatingStatus === request.id}
                  >
                    {updatingStatus === request.id ? '...' : 'Mark Dispatched'}
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
        <Card>
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
        <Card>
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
        <Card>
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
      </div>
    </div>
  );
}
