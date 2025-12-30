"use client";

import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Search, Eye, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiClient, safe } from "../../lib/apiClient";
import { useSimpleDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { useAuthedSWR } from "../../lib/useAuthedSWR";
import { toast } from "@/components/ui/use-toast";

interface MailItem {
    id: number;
    user_id: number;
    user_email: string;
    first_name: string | null;
    last_name: string | null;
    subject: string | null;
    sender_name: string | null;
    tag: string | null;
    status: string;
    received_date: string | null;
    received_at_ms: number | null;
    days_until_deletion: number | null;
    past_30_days: boolean;
    physical_destruction_date: string | null;
}

type MailSectionProps = Record<string, never>;

export function MailSection({ }: MailSectionProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const { query: searchTerm, setQuery: setSearchTerm, debouncedQuery: debouncedSearchTerm } = useSimpleDebouncedSearch(300, 0);

    // Build query parameters - only show scanned mail
    const mailItemsParams = useMemo(() => ({
        q: debouncedSearchTerm || "",
        limit: '500', // Show more items
        offset: '0'
    }), [debouncedSearchTerm]);

    const {
        data: mailItemsData,
        isLoading: mailItemsLoading,
        mutate: refetchMailItems
    } = useAuthedSWR<{ items: MailItem[]; total: number }>(
        ['/api/admin/mail-items', mailItemsParams],
        {
            dedupingInterval: 5000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 30000,
            refreshWhenHidden: false,
        }
    );

    const mailItems = safe(mailItemsData?.items, []);
    const loading = mailItemsLoading || actionLoading;

    const handleViewItem = (itemId: number) => {
        window.open(`/admin/mail/${itemId}`, '_blank');
    };

    const handleMarkDestroyed = async (itemId: number) => {
        if (!confirm("Are you sure you want to mark this mail item as physically destroyed? This action will be logged in the audit trail.")) {
            return;
        }

        setActionLoading(true);
        try {
            const response = await apiClient.post(`/api/admin/mail-items/${itemId}/mark-destroyed`);
            if (response.ok) {
                toast({
                    title: "Mail item marked as destroyed",
                    description: "Physical destruction has been logged in the audit trail.",
                });
                refetchMailItems();
            } else {
                throw new Error(response.data?.error || "Failed to mark as destroyed");
            }
        } catch (error: any) {
            toast({
                title: "Failed to mark as destroyed",
                description: error?.message || "An error occurred",
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr: string | null, ms: number | null) => {
        if (ms) {
            return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        if (dateStr) {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return '—';
    };

    const getDeletionStatus = (item: MailItem) => {
        if (item.physical_destruction_date) {
            return {
                label: "Destroyed",
                variant: "default" as const,
                color: "text-green-600",
                icon: <CheckCircle className="h-4 w-4" />
            };
        }
        if (item.past_30_days) {
            const daysPast = item.days_until_deletion ? Math.abs(Math.round(item.days_until_deletion)) : 0;
            return {
                label: `Past ${daysPast} days - Destroy now`,
                variant: "destructive" as const,
                color: "text-red-600",
                icon: <AlertTriangle className="h-4 w-4" />
            };
        }
        if (item.days_until_deletion !== null) {
            const days = Math.round(item.days_until_deletion);
            if (days <= 7) {
                return {
                    label: `${days} days until deletion`,
                    variant: "secondary" as const,
                    color: "text-amber-600",
                    icon: <AlertTriangle className="h-4 w-4" />
                };
            }
            return {
                label: `${days} days until deletion`,
                variant: "outline" as const,
                color: "text-muted-foreground",
                icon: null
            };
        }
        return {
            label: "No expiry date",
            variant: "outline" as const,
            color: "text-muted-foreground",
            icon: null
        };
    };

    const filteredItems = mailItems.filter((item: MailItem) => {
        if (!debouncedSearchTerm) return true;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return (
            String(item.id).includes(searchLower) ||
            (item.subject || '').toLowerCase().includes(searchLower) ||
            (item.sender_name || '').toLowerCase().includes(searchLower) ||
            (item.user_email || '').toLowerCase().includes(searchLower) ||
            ((item.first_name || '') + ' ' + (item.last_name || '')).toLowerCase().includes(searchLower)
        );
    });

    const processedCount = filteredItems.filter((item: MailItem) => item.status === 'processed' || item.status === 'forwarded').length;
    const needsDestructionCount = filteredItems.filter((item: MailItem) => item.past_30_days && !item.physical_destruction_date).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Scanned Mail</h1>
                    <p className="text-muted-foreground">All scanned mail items - track processing and deletion dates</p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Total: {filteredItems.length}</span>
                        <span>Processed: {processedCount}</span>
                        <span className="text-red-600">Needs Destruction: {needsDestructionCount}</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID, subject, sender, or user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Mail Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Scanned Mail</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Processed</TableHead>
                                <TableHead>Deletion Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No scanned mail items found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => {
                                    const deletionStatus = getDeletionStatus(item);
                                    const userName = item.first_name || item.last_name
                                        ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                        : item.user_email || `User #${item.user_id}`;
                                    const isProcessed = item.status === 'processed' || item.status === 'forwarded';
                                    const canMarkDestroyed = item.past_30_days && !item.physical_destruction_date;

                                    return (
                                        <TableRow 
                                            key={item.id}
                                            className={item.past_30_days && !item.physical_destruction_date ? "bg-red-50" : ""}
                                        >
                                            <TableCell className="font-medium">#{item.id}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{userName}</div>
                                                    <div className="text-xs text-muted-foreground">{item.user_email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-md truncate" title={item.subject || '—'}>
                                                    {item.subject || '—'}
                                                </div>
                                                {item.tag && (
                                                    <Badge variant="outline" className="mt-1 text-xs">{item.tag}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(item.received_date, item.received_at_ms)}
                                            </TableCell>
                                            <TableCell>
                                                {isProcessed ? (
                                                    <Badge variant="default" className="bg-green-600">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Yes
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">No</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {deletionStatus.icon}
                                                    <Badge variant={deletionStatus.variant} className={deletionStatus.color}>
                                                        {deletionStatus.label}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={() => handleViewItem(item.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {canMarkDestroyed && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive"
                                                            onClick={() => handleMarkDestroyed(item.id)}
                                                            disabled={actionLoading}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
