"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import {
    Filter,
    Eye,
    Edit,
    Trash2,
    Search,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    Tag,
    Lock,
    Unlock,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";
import { apiClient, safe } from "../../lib/apiClient";
import { useAuthedSWR } from "../../lib/useAuthedSWR";

interface ForwardingRequest {
    id: number;
    user_id: number;
    mail_item_id: number;
    status: string;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
    reason: string;
    method: string;
    created_at: string;
    updated_at: string;
    version: number;
    locked_by?: number;
    lock_expires_at?: string;
    admin_notes?: string;
    courier?: string;
    tracking_number?: string;
}

interface LockInfo {
    lockedBy: number;
    operation: string;
    expiresAt: string;
}

export function ConcurrencySafeForwardingTable() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showLockedOnly, setShowLockedOnly] = useState(false);
    const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
    const [lockInfo, setLockInfo] = useState<Map<number, LockInfo>>(new Map());
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const updateIntervalRef = useRef<NodeJS.Timeout>();

    // Fetch forwarding requests with real-time updates
    const { data: requestsData, error: requestsError, mutate: refetchRequests } = useAuthedSWR<{ 
        ok: boolean; 
        data: { items: ForwardingRequest[]; total: number } 
    }>('/api/admin/forwarding/requests?limit=100');

    const requests = requestsData?.data?.items || [];

    // Real-time updates every 5 seconds
    useEffect(() => {
        const updateInterval = () => {
            refetchRequests();
            setLastUpdate(new Date());
        };

        updateIntervalRef.current = setInterval(updateInterval, 5000);

        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [refetchRequests]);

    // Filter requests
    const filteredRequests = requests.filter(request => {
        const matchesSearch = request.to_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.postal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.courier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        const matchesLock = !showLockedOnly || request.locked_by;
        
        return matchesSearch && matchesStatus && matchesLock;
    });

    const handleStatusUpdate = async (requestId: number, newStatus: string) => {
        if (updatingItems.has(requestId)) return;

        setUpdatingItems(prev => new Set(prev).add(requestId));

        try {
            const response = await apiClient.patch(`/api/admin/forwarding/requests/${requestId}/safe`, {
                status: newStatus,
                version: requests.find(r => r.id === requestId)?.version
            });

            if (response.ok) {
                // Update local state immediately for better UX
                await refetchRequests();
            } else {
                // Handle concurrency conflicts
                if (response.data?.error?.includes('locked by another admin')) {
                    const lockInfo = response.data.lockInfo;
                    setLockInfo(prev => new Map(prev).set(requestId, lockInfo));
                } else if (response.data?.error?.includes('Version mismatch')) {
                    // Refresh data to get latest version
                    await refetchRequests();
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setUpdatingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    const handleLockRelease = async (requestId: number) => {
        try {
            await apiClient.delete(`/api/admin/forwarding/requests/${requestId}/lock`);
            await refetchRequests();
            setLockInfo(prev => {
                const newMap = new Map(prev);
                newMap.delete(requestId);
                return newMap;
            });
        } catch (error) {
            console.error('Error releasing lock:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'requested': return 'bg-blue-100 text-blue-800';
            case 'reviewed': return 'bg-yellow-100 text-yellow-800';
            case 'processing': return 'bg-purple-100 text-purple-800';
            case 'dispatched': return 'bg-green-100 text-green-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNextStatus = (currentStatus: string): string | null => {
        const statusFlow: Record<string, string> = {
            'requested': 'reviewed',
            'reviewed': 'processing',
            'processing': 'dispatched',
            'dispatched': 'delivered'
        };
        return statusFlow[currentStatus] || null;
    };

    return (
        <div className="space-y-6">
            {/* Header with real-time indicator */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Forwarding Requests
                        <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Live Updates
                        </div>
                    </h2>
                    <p className="text-muted-foreground">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                </div>
                <Button onClick={() => refetchRequests()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Concurrency Alerts */}
            {lockInfo.size > 0 && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {lockInfo.size} request(s) are locked by other admins. 
                        Updates will be queued until locks are released.
                    </AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, postal, courier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="requested">Requested</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="dispatched">Dispatched</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="locked-only"
                                checked={showLockedOnly}
                                onChange={(e) => setShowLockedOnly(e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="locked-only" className="text-sm font-medium">
                                Show locked only
                            </label>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                            <span>Total: {filteredRequests.length}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Forwarding Requests ({filteredRequests.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Courier</TableHead>
                                <TableHead>Tracking</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Lock Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.map((request) => {
                                const isUpdating = updatingItems.has(request.id);
                                const lock = lockInfo.get(request.id);
                                const nextStatus = getNextStatus(request.status);
                                
                                return (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium">
                                            #{request.id}
                                            <div className="text-xs text-muted-foreground">
                                                v{request.version}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{request.to_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {request.city}, {request.postal}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.courier ? (
                                                <span className="text-sm">{request.courier}</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {request.tracking_number ? (
                                                <span className="text-sm font-mono">{request.tracking_number}</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {formatDate(request.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {request.locked_by ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Lock className="h-3 w-3 text-red-500" />
                                                    <span className="text-red-600">Locked</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Unlock className="h-3 w-3 text-green-500" />
                                                    <span className="text-green-600">Available</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {nextStatus && !request.locked_by && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStatusUpdate(request.id, nextStatus)}
                                                        disabled={isUpdating}
                                                    >
                                                        {isUpdating ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4" />
                                                        )}
                                                        {nextStatus}
                                                    </Button>
                                                )}
                                                {lock && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleLockRelease(request.id)}
                                                    >
                                                        <Unlock className="h-4 w-4" />
                                                        Release
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
