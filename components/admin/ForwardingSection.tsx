"use client";

import { useState, useEffect } from "react";
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
import { apiClient, logAdminAction, useApiData } from "../../lib";
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
    processing: number;
    shipped: number;
    delivered: number;
}

interface ForwardingSectionProps { }

export function ForwardingSection({ }: ForwardingSectionProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

    // API Data fetching
    const { data: forwardingRequests, isLoading: requestsLoading, refetch: refetchRequests } = useApiData('/api/admin/forwarding-requests');
    const { data: forwardingStats, isLoading: statsLoading } = useApiData('/api/admin/forwarding-requests/stats');

    const requestsData = forwardingRequests || [];
    const stats = forwardingStats as ForwardingStats | null;

    const filteredRequests = requestsData.filter((request: ForwardingRequest) => {
        const matchesSearch = request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.mailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (request.trackingNumber && request.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "all" || request.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_forwarding_refresh');
            await refetchRequests();
        } catch (error) {
            await logAdminAction('admin_forwarding_refresh_error', {
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
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
        setLoading(true);
        try {
            await logAdminAction('admin_process_forwarding_request', { requestId });
            await apiClient.post(`/api/admin/forwarding-requests/${requestId}/process`);
            refetchRequests();
        } catch (error) {
            await logAdminAction('admin_process_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleShipRequest = async (requestId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_ship_forwarding_request', { requestId });
            await apiClient.post(`/api/admin/forwarding-requests/${requestId}/ship`);
            refetchRequests();
        } catch (error) {
            await logAdminAction('admin_ship_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async (requestId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_cancel_forwarding_request', { requestId });
            await apiClient.post(`/api/admin/forwarding-requests/${requestId}/cancel`);
            refetchRequests();
        } catch (error) {
            await logAdminAction('admin_cancel_forwarding_request_error', {
                requestId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedRequests.length === 0) return;

        setLoading(true);
        try {
            await logAdminAction('admin_bulk_forwarding_action', { action, requestIds: selectedRequests });
            await apiClient.post(`/api/admin/forwarding-requests/bulk/${action}`, { requestIds: selectedRequests });
            setSelectedRequests([]);
            refetchRequests();
        } catch (error) {
            await logAdminAction('admin_bulk_forwarding_action_error', {
                action,
                requestIds: selectedRequests,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportRequests = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_forwarding_requests', {
                filters: { statusFilter, priorityFilter, searchTerm }
            });

            const response = await apiClient.get(`/api/admin/forwarding-requests/export?status=${statusFilter}&priority=${priorityFilter}&search=${encodeURIComponent(searchTerm)}`);

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `forwarding-requests-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_export_forwarding_requests_error', {
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
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
        setSelectedRequests(filteredRequests.map((request: ForwardingRequest) => request.id));
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
                    {forwardingStats && (
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Total: {stats?.total || 0}</span>
                            <span>Pending: {stats?.pending || 0}</span>
                            <span>Processing: {stats?.processing || 0}</span>
                            <span>Shipped: {stats?.shipped || 0}</span>
                            <span>Delivered: {stats?.delivered || 0}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportRequests}
                        disabled={loading}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
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
                                    disabled={loading}
                                >
                                    <Play className="h-4 w-4" />
                                    Process
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('ship')}
                                    disabled={loading}
                                >
                                    <Truck className="h-4 w-4" />
                                    Ship
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('cancel')}
                                    disabled={loading}
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
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="express">Express</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
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
                                    checked={filteredRequests.length > 0 && filteredRequests.every((request: ForwardingRequest) => selectedRequests.includes(request.id))}
                                    onChange={filteredRequests.length > 0 && filteredRequests.every((request: ForwardingRequest) => selectedRequests.includes(request.id)) ? clearSelection : selectAllRequests}
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
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                    No forwarding requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((request: ForwardingRequest) => (
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
                                                <Button size="sm" variant="outline" onClick={() => handleProcessRequest(request.id)} disabled={loading}>
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {request.status === "processing" && (
                                                <Button size="sm" variant="outline" onClick={() => handleShipRequest(request.id)} disabled={loading}>
                                                    <Truck className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {request.status !== "delivered" && request.status !== "cancelled" && (
                                                <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request.id)} disabled={loading}>
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
        </div>
    );
}
