"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
    RefreshCcw,
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
} from "lucide-react";
import { apiClient, safe, adminApi } from "../../lib/apiClient";
import { useApiData } from "../../lib/client-hooks";

const logAdminAction = async (action: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: null // Will be set by backend
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};
import { getErrorMessage, getErrorStack } from "../../lib/errors";

interface ForwardingRequest {
    id: number;
    userId: number;
    userName: string;
    mailItemId: number;
    mailSubject: string;
    destination: string;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    priority: "standard" | "express" | "urgent";
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    cost: string;
    createdAt: string;
    updatedAt: string;
}

interface ForwardingStats {
    total: number;
    pending: number;
    fulfilled: number;
    canceled: number;
}

type ForwardingSectionProps = Record<string, never>;

export function ForwardingSection({ }: ForwardingSectionProps) {
    const [requests, setRequests] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [isFetchingRequests, setIsFetchingRequests] = useState(false);
    const [isMutating, setIsMutating] = useState(false);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState<"pending" | "fulfilled" | "canceled" | "all">("pending");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [stats, setStats] = useState<ForwardingStats | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const loadRequests = useCallback(async () => {
        setIsFetchingRequests(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
            });
            if (q) params.set("q", q);
            if (status && status !== "all") params.set("status", status);

            const resp = await adminApi.forwardingQueue(params);
            if (resp.ok) {
                const data = resp.data as { items?: any[]; total?: number };
                const items = data.items ?? [];
                setRequests(items);
                setTotal(data.total ?? items.length);

                // Compute stats from items
                const counts = {
                    total: data.total ?? items.length,
                    pending: items.filter(i => i.status === 'pending').length,
                    fulfilled: items.filter(i => i.status === 'fulfilled').length,
                    canceled: items.filter(i => i.status === 'canceled').length,
                };
                setStats(counts);
            } else {
                console.error("forwardingQueue failed:", resp.message);
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
    }, [page, pageSize, q, status]);

    // Load stats
    const loadStats = async () => {
        try {
            const response = await apiClient.get('/api/admin/forwarding-requests/stats');
            if (response.ok) {
                setStats(response.data as any);
            }
        } catch (error) {
            console.error('Failed to load forwarding stats:', error);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        loadStats();
    }, []);

    const requestsData = requests;

    const handleRefresh = async () => {
        await loadRequests();
    };

    const onSearchChange = (val: string) => {
        setPage(1);
        setQ(val);
    };

    const onStatusChange = (val: "pending" | "fulfilled" | "canceled" | "all") => {
        setPage(1);
        setStatus(val);
    };

    const handleViewRequest = async (requestId: number) => {
        try {
            await logAdminAction('admin_view_forwarding_request', { requestId });
            window.open(`/admin/forwarding/${requestId}`, '_blank');
        } catch (error) {
            await logAdminAction('admin_view_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        }
    };

    const handleEditRequest = async (requestId: number) => {
        try {
            await logAdminAction('admin_edit_forwarding_request', { requestId });
            window.open(`/admin/forwarding/${requestId}/edit`, '_blank');
        } catch (error) {
            await logAdminAction('admin_edit_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        }
    };

    const handleProcessRequest = async (requestId: number) => {
        try {
            setIsMutating(true);
            await logAdminAction('admin_process_forwarding_request', { requestId });
            await apiClient.post(`/api/admin/forwarding-requests/${requestId}/process`);
            await loadRequests();
        } catch (error) {
            await logAdminAction('admin_process_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleShipRequest = async (requestId: number) => {
        try {
            setIsMutating(true);
            await logAdminAction('admin_ship_forwarding_request', { requestId });
            await apiClient.post(`/api/admin/forwarding-requests/${requestId}/ship`);
            await loadRequests();
        } catch (error) {
            await logAdminAction('admin_ship_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleCancelRequest = async (requestId: number) => {
        try {
            setIsMutating(true);
            await logAdminAction('admin_cancel_forwarding_request', { requestId });
            await adminApi.cancelForward(requestId.toString());
            await loadRequests();
        } catch (error) {
            await logAdminAction('admin_cancel_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedRequests.length === 0) return;

        try {
            setIsMutating(true);
            await logAdminAction('admin_bulk_forwarding_action', { action, requestIds: selectedRequests });
            await apiClient.post(`/api/admin/forwarding-requests/bulk/${action}`, { requestIds: selectedRequests });
            setSelectedRequests([]);
            await loadRequests();
        } catch (error) {
            await logAdminAction('admin_bulk_forwarding_action_error', {
                action,
                requestIds: selectedRequests,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleExportRequests = async () => {
        setIsExporting(true);
        try {
            await logAdminAction('admin_export_forwarding_requests', {
                filters: { q, status },
            });

            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (status && status !== 'all') params.set('status', status);
            // add pagination if your backend supports it for exports:
            // params.set('page', String(page));
            // params.set('page_size', String(pageSize));

            const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const url = `${base}/api/admin/forwarding/requests/export?${params.toString()}`;

            window.open(url, '_blank');
        } catch (error) {
            await logAdminAction('admin_export_forwarding_requests_error', {
                error_message: (error as Error)?.message ?? String(error),
            });
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleRequestSelection = (requestId: number) => {
        setSelectedRequests(prev =>
            prev.includes(requestId)
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    };

    const selectAllRequests = () => {
        setSelectedRequests(requestsData.map((request: any) => request.id));
    };

    const clearSelection = () => {
        setSelectedRequests([]);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
            case "processing": return <Package className="h-4 w-4 text-blue-500" />;
            case "shipped": return <Truck className="h-4 w-4 text-purple-500" />;
            case "delivered": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "cancelled": return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-100 text-red-800";
            case "express": return "bg-yellow-100 text-yellow-800";
            case "standard": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
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
                            <span>Fulfilled: {stats.fulfilled}</span>
                            <span>Canceled: {stats.canceled}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportRequests}
                        disabled={isExporting || isMutating || isFetchingRequests}
                    >
                        <Download className="h-4 w-4" />
                        {isExporting ? 'Exporting…' : 'Export'}
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleRefresh}
                        disabled={isFetchingRequests || isMutating}
                    >
                        <RefreshCcw className={`h-4 w-4 ${isFetchingRequests ? 'animate-spin' : ''}`} />
                        {isFetchingRequests ? "Refreshing…" : "Refresh"}
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedRequests.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{selectedRequests.length} requests selected</span>
                                <Button variant="ghost" size="sm" onClick={clearSelection}>
                                    Clear
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('process')}
                                    disabled={isMutating}
                                >
                                    <Play className="h-4 w-4" />
                                    Process
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('ship')}
                                    disabled={isMutating}
                                >
                                    <Truck className="h-4 w-4" />
                                    Ship
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('cancel')}
                                    disabled={isMutating}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search forwarding requests..."
                                    value={q}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={status} onValueChange={onStatusChange}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Forwarding Requests Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <input
                                    type="checkbox"
                                    checked={requestsData.length > 0 && requestsData.every((request: any) => selectedRequests.includes(request.id))}
                                    onChange={requestsData.length > 0 && requestsData.every((request: any) => selectedRequests.includes(request.id)) ? clearSelection : selectAllRequests}
                                    className="rounded"
                                />
                            </TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Mail Item</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tracking</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requestsData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                    No forwarding requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            requestsData.map((request: any) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedRequests.includes(request.id)}
                                            onChange={() => toggleRequestSelection(request.id)}
                                            className="rounded"
                                        />
                                    </TableCell>
                                    <TableCell>#{request.id}</TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{request.userName}</div>
                                            <div className="text-sm text-muted-foreground">ID: {request.userId}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">#{request.mailItemId}</div>
                                            <div className="text-sm text-muted-foreground">{request.mailSubject}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-xs">
                                            <div className="text-sm font-medium">{request.destination}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getPriorityColor(request.priority)} variant="secondary">
                                            {request.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(request.status)}
                                            <Badge variant="outline" className="capitalize">
                                                {request.status}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {request.trackingNumber ? (
                                            <div>
                                                <div className="text-sm font-medium">{request.trackingNumber}</div>
                                                <div className="text-xs text-muted-foreground">{request.carrier}</div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{request.cost}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{request.createdAt}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleViewRequest(request.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleEditRequest(request.id)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {request.status === "pending" && (
                                                <Button size="sm" variant="outline" onClick={() => handleProcessRequest(request.id)} disabled={isMutating}>
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {request.status === "processing" && (
                                                <Button size="sm" variant="outline" onClick={() => handleShipRequest(request.id)} disabled={isMutating}>
                                                    <Truck className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {request.status !== "delivered" && request.status !== "cancelled" && (
                                                <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request.id)} disabled={isMutating}>
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} requests
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isFetchingRequests}
                        variant="outline"
                        size="sm"
                    >
                        Previous
                    </Button>
                    <span className="text-sm">
                        Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
                    </span>
                    <Button
                        onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                        disabled={page >= Math.ceil(total / pageSize) || isFetchingRequests}
                        variant="outline"
                        size="sm"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
