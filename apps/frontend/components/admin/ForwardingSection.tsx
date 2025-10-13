"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import CollaborativeForwardingBoard from "./CollaborativeForwardingBoard";
import { useToast } from "../ui/use-toast";
import { MAIL_STATUS, type MailStatus } from '../../lib/mailStatus';

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
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
    BarChart3,
    TrendingUp,
    Activity,
} from "lucide-react";

interface ForwardingRequest {
    id: number;
    user_id: number;
    mail_item_id: number;
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
    const { toast } = useToast();
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

            const params = new URLSearchParams();
            if (status !== "all") {
                if (status === "active") {
                    params.append("status", "active");
                } else {
                    params.append("status", status);
                }
            }
            if (query) {
                params.append("q", query);
            }
            params.append("limit", pageSize.toString());
            params.append("offset", ((page - 1) * pageSize).toString());

            const response = await fetch(`/api/admin/forwarding/requests?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.ok && Array.isArray(data.data)) {
                setRequests(data.data);
                setTotal(data.pagination?.total || data.data.length);
            } else {
                throw new Error(data.error || "Failed to load forwarding requests");
            }
        } catch (err: any) {
            console.error("Error loading forwarding requests:", err);
        } finally {
            setIsFetchingRequests(false);
        }
    }, [status, page, pageSize]);

    const loadStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('vah_jwt');
            const response = await fetch('/api/admin/forwarding/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.ok) {
                    setStats(data.data);
                }
            }
        } catch (err) {
            console.error("Error loading forwarding stats:", err);
        }
    }, []);

    useEffect(() => {
        loadRequests(debouncedSearchTerm);
    }, [loadRequests, debouncedSearchTerm]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleStatusUpdate = async (requestId: number, action: string, extraData?: any) => {
        try {
            setIsMutating(true);

            // Store original state for rollback
            const originalRequests = [...requests];

            // Optimistically update the local state based on action
            let newStatus: MailStatus | '' = '';
            if (action === 'start_processing') newStatus = MAIL_STATUS.Processing;
            else if (action === 'mark_dispatched') newStatus = MAIL_STATUS.Dispatched;
            else if (action === 'mark_delivered') newStatus = MAIL_STATUS.Delivered;
            // FIX: Handle mark_reviewed action for backward compatibility
            else if (action === 'mark_reviewed') newStatus = MAIL_STATUS.Requested;

            if (newStatus) {
                setRequests(prevRequests =>
                    prevRequests.map(req =>
                        req.id === requestId
                            ? {
                                ...req,
                                status: newStatus,
                                updated_at: new Date().toISOString(),
                                ...extraData
                            }
                            : req
                    )
                );
            }

            const token = localStorage.getItem('vah_jwt');
            console.log('[ForwardingSection] Making API call:', {
                url: `${API_BASE}/api/admin/forwarding/requests/${requestId}`,
                method: 'PATCH',
                action,
                extraData,
                hasToken: !!token
            });

            const response = await fetch(`${API_BASE}/api/admin/forwarding/requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action,
                    ...extraData
                })
            });

            if (!response.ok) {
                console.error('[ForwardingSection] API call failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[ForwardingSection] API response:', data);

            if (data.ok) {
                // Success - keep optimistic update, just refresh stats
                await loadStats();
            } else {
                // Rollback on failure
                setRequests(originalRequests);
                throw new Error(data.error || "Failed to update request");
            }
        } catch (err: any) {
            console.error("Error updating request:", err);
            toast({
                title: "Request Update Failed",
                description: err.message || "Failed to update request",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleDispatch = (request: ForwardingRequest) => {
        setSelectedRequest(request);
        setDispatchData({
            courier: request.courier || '',
            tracking_number: request.tracking_number || '',
            admin_notes: request.admin_notes || ''
        });
        setShowDispatchModal(true);
    };

    const handleDispatchSubmit = async () => {
        if (!selectedRequest) return;

        try {
            await handleStatusUpdate(selectedRequest.id, 'mark_dispatched', dispatchData);
            setShowDispatchModal(false);
            setSelectedRequest(null);
        } catch (error) {
            console.error("Error dispatching request:", error);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedRequests.length === 0) return;

        try {
            setIsMutating(true);
            const token = localStorage.getItem('vah_jwt');
            const response = await fetch('/api/admin/forwarding/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action,
                    request_ids: selectedRequests
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.ok) {
                setSelectedRequests([]);
                await loadRequests(debouncedSearchTerm);
                await loadStats();
            } else {
                throw new Error(data.error || "Failed to perform bulk action");
            }
        } catch (err: any) {
            console.error("Error performing bulk action:", err);
            toast({
                title: "Bulk Action Failed",
                description: err.message || "Failed to perform bulk action",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = localStorage.getItem('vah_jwt');
            const params = new URLSearchParams();
            if (status !== "all") {
                if (status === "active") {
                    params.append("status", "active");
                } else {
                    params.append("status", status);
                }
            }
            if (debouncedSearchTerm) {
                params.append("q", debouncedSearchTerm);
            }

            const response = await fetch(`/api/admin/forwarding/export?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `forwarding-requests-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error("Error exporting requests:", err);
            toast({
                title: "Export Failed",
                description: err.message || "Failed to export requests",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'Requested': { variant: 'secondary', label: 'Requested' },
            'Reviewed': { variant: 'outline', label: 'Reviewed' },
            'Processing': { variant: 'default', label: 'Processing' },
            'Dispatched': { variant: 'default', label: 'Dispatched' },
            'Delivered': { variant: 'default', label: 'Delivered' },
            'Cancelled': { variant: 'destructive', label: 'Cancelled' },
        };
        const { variant, label } = statusMap[status] || { variant: 'outline', label: status };
        return <Badge variant={variant}>{label}</Badge>;
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Forwarding Requests</h2>
                    <p className="text-muted-foreground">Manage mail forwarding requests</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => loadRequests(debouncedSearchTerm)} disabled={isFetchingRequests} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Requests</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pending}</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Fulfilled</p>
                                    <p className="text-2xl font-bold">{stats.fulfilled}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Canceled</p>
                                    <p className="text-2xl font-bold">{stats.canceled}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search requests..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active Only</SelectItem>
                                    <SelectItem value="Requested">Requested</SelectItem>
                                    <SelectItem value="Reviewed">Reviewed</SelectItem>
                                    <SelectItem value="Processing">Processing</SelectItem>
                                    <SelectItem value="Dispatched">Dispatched</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedRequests.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {selectedRequests.length} request(s) selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('mark_reviewed')}
                                    disabled={isMutating}
                                >
                                    Mark Reviewed
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('start_processing')}
                                    disabled={isMutating}
                                >
                                    Start Processing
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedRequests([])}
                                >
                                    Clear Selection
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content - Use the new 3-section workflow */}
            <CollaborativeForwardingBoard />

            {/* Dispatch Modal */}
            {showDispatchModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Dispatch Request #{selectedRequest.id}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Courier</label>
                                <Input
                                    value={dispatchData.courier}
                                    onChange={(e) => setDispatchData(prev => ({ ...prev, courier: e.target.value }))}
                                    placeholder="e.g., Royal Mail, DHL, UPS"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Tracking Number</label>
                                <Input
                                    value={dispatchData.tracking_number}
                                    onChange={(e) => setDispatchData(prev => ({ ...prev, tracking_number: e.target.value }))}
                                    placeholder="Enter tracking number"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Admin Notes</label>
                                <Textarea
                                    value={dispatchData.admin_notes}
                                    onChange={(e) => setDispatchData(prev => ({ ...prev, admin_notes: e.target.value }))}
                                    placeholder="Optional notes about this dispatch"
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