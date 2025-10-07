"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import {
    Truck,
    Package,
    MapPin,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    Edit,
    Play,
    Pause,
    RotateCcw,
    Download,
    Search,
    Filter,
    User,
    Mail,
    Calendar,
    RefreshCw,
} from "lucide-react";

interface ForwardingRequest {
    id: number;
    user_id: number;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postal: string;
    country: string;
    status: string;
    subject: string;
    tag?: string;
    email: string;
    courier?: string;
    tracking_number?: string;
    admin_notes?: string;
    created_at: number;
    reviewed_at?: number;
    processing_at?: number;
    dispatched_at?: number;
    delivered_at?: number;
    cancelled_at?: number;
}

interface ForwardingStats {
    total: number;
    pending: number;
    fulfilled: number;
    canceled: number;
}

export function ForwardingSection() {
    const [requests, setRequests] = useState<ForwardingRequest[]>([]);
    const [total, setTotal] = useState(0);
    const [isFetchingRequests, setIsFetchingRequests] = useState(false);
    const [isMutating, setIsMutating] = useState(false);

    const [status, setStatus] = useState<"active" | "Requested" | "Reviewed" | "Processing" | "Dispatched" | "Delivered" | "Cancelled" | "all">("active");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [stats, setStats] = useState<ForwardingStats | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Show modal for dispatch details
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ForwardingRequest | null>(null);
    const [dispatchData, setDispatchData] = useState({ courier: "", tracking_number: "", admin_notes: "" });

    // Use debounced search hook (same pattern as MailSection)
    const { query: searchTerm, setQuery: setSearchTerm, debouncedQuery: debouncedSearchTerm, isSearching } = useDebouncedSearch({
        delay: 300,
        minLength: 0,
        onSearch: async (query) => {
            await loadRequests(query);
        }
    });

    const loadRequests = useCallback(async (searchQuery?: string) => {
        setIsFetchingRequests(true);
        try {
            // Use the new admin forwarding API
            const token = localStorage.getItem('vah_jwt');
            const query = searchQuery || "";
            const res = await fetch(`/api/admin/forwarding/requests?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}&limit=${pageSize}&offset=${(page - 1) * pageSize}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                const items = (data && data.ok && Array.isArray(data.data)) ? data.data : [];
                setRequests(items);
                setTotal(items.length);

                // Compute stats from items
                const counts = {
                    total: items.length,
                    pending: items.filter((i: any) => i.status === 'Requested').length,
                    fulfilled: items.filter((i: any) => i.status === 'Delivered').length,
                    canceled: items.filter((i: any) => i.status === 'Cancelled').length,
                };
                setStats(counts);
            } else {
                console.error("Failed to load forwarding requests:", res.status, res.statusText);
                if (res.status === 401) {
                    alert("Session expired. Please log in again as an admin.");
                    window.location.href = '/admin/login';
                    return;
                } else if (res.status === 403) {
                    alert("Access denied. You need to be logged in as an admin to view forwarding requests.");
                    window.location.href = '/admin/login';
                    return;
                }
                setRequests([]);
                setTotal(0);
                setStats(null);
            }
        } catch (err) {
            console.error("loadRequests error:", err);
            setRequests([]);
            setTotal(0);
            setStats(null);
        } finally {
            setIsFetchingRequests(false);
        }
    }, [page, status]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleStatusUpdate = async (requestId: number, action: string, extraData?: any) => {
        // Add confirmation for cancel action
        if (action === 'cancel') {
            const confirmed = window.confirm('Are you sure you want to cancel this forwarding request? This action cannot be undone.');
            if (!confirmed) {
                return;
            }
        }

        setIsMutating(true);
        try {
            const token = localStorage.getItem('vah_jwt');
            const response = await fetch(`/api/admin/forwarding/requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                credentials: 'include',
                body: JSON.stringify({ action, ...extraData })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.ok) {
                    // Refresh the list
                    loadRequests();
                } else {
                    alert('Failed to update request: ' + (result.error || 'Unknown error'));
                }
            } else {
                const errorData = await response.json();
                alert('Failed to update request: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating request:', error);
            alert('Error updating request. Please try again.');
        } finally {
            setIsMutating(false);
        }
    };

    const handleDispatch = (request: ForwardingRequest) => {
        setSelectedRequest(request);
        setDispatchData({
            courier: request.courier || "",
            tracking_number: request.tracking_number || "",
            admin_notes: request.admin_notes || ""
        });
        setShowDispatchModal(true);
    };

    const handleDispatchSubmit = async () => {
        if (!selectedRequest) return;

        await handleStatusUpdate(selectedRequest.id, 'mark_dispatched', dispatchData);
        setShowDispatchModal(false);
        setSelectedRequest(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Requested': return 'bg-yellow-100 text-yellow-800';
            case 'Reviewed': return 'bg-blue-100 text-blue-800';
            case 'Processing': return 'bg-purple-100 text-purple-800';
            case 'Dispatched': return 'bg-orange-100 text-orange-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return '—';
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Forwarding Management</h1>
                    <p className="text-muted-foreground">Track and manage mail forwarding requests</p>
                    {stats && (
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Total: {stats.total}</span>
                            <span>Pending: {stats.pending}</span>
                            <span>Delivered: {stats.fulfilled}</span>
                            <span>Cancelled: {stats.canceled}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => loadRequests()}
                        disabled={isFetchingRequests}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetchingRequests ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex gap-2">
                            <Input
                                placeholder="Search by name, postal code, courier, or tracking..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                                disabled={isSearching}
                            />
                            {isSearching && (
                                <div className="flex items-center px-3">
                                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>
                        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active Requests (Default)</SelectItem>
                                <SelectItem value="Requested">Requested</SelectItem>
                                <SelectItem value="Reviewed">Reviewed</SelectItem>
                                <SelectItem value="Processing">Processing</SelectItem>
                                <SelectItem value="Dispatched">Dispatched</SelectItem>
                                <SelectItem value="Delivered">Delivered (Completed)</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                <SelectItem value="all">All Statuses</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Mail Details</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tracking</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isFetchingRequests ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex items-center justify-center">
                                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                            Loading requests...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No forwarding requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium">#{request.user_id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{request.to_name}</div>
                                                <div className="text-sm text-muted-foreground">{request.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{request.address1}</div>
                                                {request.address2 && <div>{request.address2}</div>}
                                                <div>{request.city}, {request.postal}</div>
                                                <div className="text-muted-foreground">{request.country}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium">{request.subject}</div>
                                                <div className="text-muted-foreground">Tag: {request.tag || '—'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {request.courier && <div>Courier: {request.courier}</div>}
                                                {request.tracking_number && <div>Tracking: {request.tracking_number}</div>}
                                                {!request.courier && !request.tracking_number && <div className="text-muted-foreground">—</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>Created: {formatDate(request.created_at)}</div>
                                                {request.reviewed_at && <div>Reviewed: {formatDate(request.reviewed_at)}</div>}
                                                {request.processing_at && <div>Processing: {formatDate(request.processing_at)}</div>}
                                                {request.dispatched_at && <div>Dispatched: {formatDate(request.dispatched_at)}</div>}
                                                {request.delivered_at && <div>Delivered: {formatDate(request.delivered_at)}</div>}
                                                {request.cancelled_at && <div>Cancelled: {formatDate(request.cancelled_at)}</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {request.status === 'Requested' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusUpdate(request.id, 'mark_reviewed')}
                                                            disabled={isMutating}
                                                        >
                                                            Review
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusUpdate(request.id, 'start_processing')}
                                                            disabled={isMutating}
                                                        >
                                                            Process
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleStatusUpdate(request.id, 'cancel')}
                                                            disabled={isMutating}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                )}
                                                {request.status === 'Reviewed' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusUpdate(request.id, 'start_processing')}
                                                            disabled={isMutating}
                                                        >
                                                            Process
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleStatusUpdate(request.id, 'cancel')}
                                                            disabled={isMutating}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                )}
                                                {request.status === 'Processing' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleDispatch(request)}
                                                            disabled={isMutating}
                                                        >
                                                            Dispatch
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleStatusUpdate(request.id, 'cancel')}
                                                            disabled={isMutating}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                )}
                                                {request.status === 'Dispatched' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStatusUpdate(request.id, 'mark_delivered')}
                                                        disabled={isMutating}
                                                    >
                                                        Delivered
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dispatch Modal */}
            {showDispatchModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Mark as Dispatched</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Courier</label>
                                <Input
                                    value={dispatchData.courier}
                                    onChange={(e) => setDispatchData({ ...dispatchData, courier: e.target.value })}
                                    placeholder="e.g. Royal Mail, DHL, UPS"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tracking Number</label>
                                <Input
                                    value={dispatchData.tracking_number}
                                    onChange={(e) => setDispatchData({ ...dispatchData, tracking_number: e.target.value })}
                                    placeholder="e.g. RM123456789GB"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Admin Notes</label>
                                <Textarea
                                    value={dispatchData.admin_notes}
                                    onChange={(e) => setDispatchData({ ...dispatchData, admin_notes: e.target.value })}
                                    placeholder="Additional notes..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDispatchSubmit}
                                    className="flex-1"
                                    disabled={isMutating}
                                >
                                    {isMutating ? "Updating..." : "Mark Dispatched"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDispatchModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}