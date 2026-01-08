"use client";

import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Search, Eye, Trash2, AlertTriangle, CheckCircle, AlertCircle, Download } from "lucide-react";
import { apiClient, safe } from "../../lib/apiClient";
import { useSimpleDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { useAuthedSWR } from "../../lib/useAuthedSWR";
import { useToast } from "@/components/ui/use-toast";

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
    created_at: number | null;
    expires_at: number | null;
    days_until_deletion: number | null;
    past_30_days: boolean;
    physical_destruction_date: string | null;
}

type MailSectionProps = Record<string, never>;

export function MailSection({ }: MailSectionProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();
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
            revalidateOnFocus: true, // Refresh when tab gets focus
            revalidateOnReconnect: true, // Refresh when connection restored
            refreshInterval: 10000, // Refresh every 10 seconds (faster updates)
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
            // Use BFF route - credentials are included automatically via apiClient
            const response = await apiClient.post(`/api/bff/admin/mail-items/${itemId}/mark-destroyed`, undefined, {
                credentials: 'include'
            });
            
            // apiClient returns { ok: boolean, data?: any, message?: string, status?: number }
            // On success: { ok: true, data: { ok: true } }
            // On HTTP error (4xx/5xx): { ok: false, message: string, status: number }
            // On JSON error response: { ok: false, data: { ok: false, error: string, message: string } }
            
            const isSuccess = response.ok && (response.data?.ok === true || (response as any).ok === true);
            
            if (isSuccess) {
                toast({
                    title: "Mail item marked as destroyed",
                    description: "Physical destruction has been logged in the audit trail.",
                });
                refetchMailItems();
            } else {
                // Extract error message from various possible response structures
                const errorData = response.data as { error?: string; message?: string } | undefined;
                const errorMessage = errorData?.message 
                    || errorData?.error 
                    || (response as any).message 
                    || `Failed to mark as destroyed (status: ${(response as any).status || 'unknown'})`;
                console.error('[Mark Destroyed] Backend error:', {
                    response,
                    errorData,
                    status: (response as any).status,
                    fullResponse: JSON.stringify(response, null, 2)
                });
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            // Handle both apiClient errors and fetch errors
            const errorMessage = error?.response?.data?.message 
                || error?.response?.data?.error 
                || error?.data?.message
                || error?.data?.error
                || error?.message 
                || "An error occurred";
            console.error('[Mark Destroyed] Error:', {
                error,
                responseData: error?.response?.data,
                data: error?.data
            });
            toast({
                title: "Failed to mark as destroyed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportDestructionLog = () => {
        // Simple download - browser handles it automatically
        window.location.href = '/api/bff/admin/exports/destruction-log';
    };

    const parseDate = (dateStr: string | null, ms: number | null, fallbackMs?: number | null): Date | null => {
        // Try received_at_ms first
        if (ms !== null && ms !== undefined) {
            const msNum = typeof ms === 'string' ? parseInt(ms, 10) : ms;
            if (!isNaN(msNum) && msNum > 0) {
                const date = new Date(msNum);
                if (!isNaN(date.getTime())) return date;
            }
        }
        // Try received_date string
        if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date;
        }
        // Fallback to created_at if provided
        if (fallbackMs !== null && fallbackMs !== undefined) {
            const msNum = typeof fallbackMs === 'string' ? parseInt(fallbackMs, 10) : fallbackMs;
            if (!isNaN(msNum) && msNum > 0) {
                const date = new Date(msNum);
                if (!isNaN(date.getTime())) return date;
            }
        }
        return null;
    };

    const formatDate = (dateStr: string | null, ms: number | null, fallbackMs?: number | null) => {
        const date = parseDate(dateStr, ms, fallbackMs);
        if (date) {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return '—';
    };

    const formatDateDDMMYYYY = (dateStr: string | null, ms: number | null, fallbackMs?: number | null) => {
        const date = parseDate(dateStr, ms, fallbackMs);
        if (date) {
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return '—';
    };

    const getDestructionEligibilityDate = (item: MailItem): string => {
        // Use expires_at if available
        if (item.expires_at !== null && item.expires_at !== undefined) {
            const expiresMs = typeof item.expires_at === 'string' ? parseInt(item.expires_at, 10) : item.expires_at;
            if (!isNaN(expiresMs) && expiresMs > 0) {
                const date = new Date(expiresMs);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            }
        }

        // Calculate from received date + 30 days
        const receivedDate = parseDate(item.received_date, item.received_at_ms, item.created_at);
        if (receivedDate) {
            const eligibilityDate = new Date(receivedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
            return eligibilityDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        return '—';
    };

    const getDestructionEligibilityStatus = (item: MailItem): { label: string; isEligible: boolean } => {
        // If already destroyed, show destroyed status
        if (item.physical_destruction_date) {
            // physical_destruction_date is an ISO string from PostgreSQL TIMESTAMPTZ
            const destroyedDate = typeof item.physical_destruction_date === 'string'
                ? new Date(item.physical_destruction_date)
                : item.physical_destruction_date
                    ? new Date(item.physical_destruction_date)
                    : null;
            const destroyedDateStr = destroyedDate && !isNaN(destroyedDate.getTime())
                ? destroyedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';
            return { label: `Destroyed on ${destroyedDateStr}`, isEligible: false };
        }

        // Use backend's past_30_days calculation if available (most reliable)
        if (item.past_30_days === true) {
            return { label: "Eligible for destruction", isEligible: true };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let eligibilityDate: Date | null = null;

        // Use expires_at if available
        if (item.expires_at !== null && item.expires_at !== undefined) {
            const expiresMs = typeof item.expires_at === 'string' ? parseInt(item.expires_at, 10) : item.expires_at;
            if (!isNaN(expiresMs) && expiresMs > 0) {
                const date = new Date(expiresMs);
                if (!isNaN(date.getTime())) {
                    eligibilityDate = date;
                }
            }
        }

        // Calculate from received date + 30 days
        if (!eligibilityDate) {
            const receivedDate = parseDate(item.received_date, item.received_at_ms, item.created_at);
            if (receivedDate) {
                eligibilityDate = new Date(receivedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
            }
        }

        if (!eligibilityDate) {
            return { label: "Not yet eligible", isEligible: false };
        }

        eligibilityDate.setHours(0, 0, 0, 0);
        const isEligible = today >= eligibilityDate;

        return {
            label: isEligible ? "Eligible for destruction" : "Not yet eligible",
            isEligible
        };
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

    const [activeTab, setActiveTab] = useState<string>("needs-destruction");

    // Filter items by search term
    const searchFilteredItems: MailItem[] = mailItems.filter((item: MailItem) => {
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

    // Separate items into two groups
    const needsDestructionItems: MailItem[] = searchFilteredItems.filter(
        (item) => item.past_30_days && !item.physical_destruction_date
    );
    const allItems: MailItem[] = searchFilteredItems;

    // Use the appropriate list based on active tab
    const filteredItems: MailItem[] = activeTab === "needs-destruction" ? needsDestructionItems : allItems;

    const processedCount = filteredItems.filter((item) => item.status === 'processed' || item.status === 'forwarded').length;
    const needsDestructionCount = needsDestructionItems.length;

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
                <Button
                    onClick={handleExportDestructionLog}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export Destruction Log
                </Button>
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

            {/* Helper Note */}
            <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                    <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">📋 Physical Destruction Eligibility Information</p>
                        <p className="text-xs">
                            These fields are used to populate the Shredding & Destruction Log. Eligibility is system-calculated based on receipt date and retention rules (30-day GDPR retention period). Staff should manually copy these values into the Excel destruction log.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for Needs Destruction vs All Mail */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="needs-destruction" className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Needs Destruction ({needsDestructionCount})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        All Mail ({allItems.length})
                    </TabsTrigger>
                </TabsList>

                {/* Needs Destruction Tab */}
                <TabsContent value="needs-destruction" className="mt-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Processed</TableHead>
                                    <TableHead>Deletion Status</TableHead>
                                    <TableHead>Physical Destruction Eligibility</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                                                className={item.past_30_days && !item.physical_destruction_date ? "bg-red-50/30 border-l-4 border-l-red-500" : ""}
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
                                                    {formatDate(item.received_date, item.received_at_ms, item.created_at)}
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
                                                        <Badge
                                                            variant={deletionStatus.variant === "destructive" ? "outline" : deletionStatus.variant}
                                                            className={deletionStatus.variant === "destructive" ? "border-0 bg-transparent " + deletionStatus.color : deletionStatus.color}
                                                        >
                                                            {deletionStatus.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-2 text-xs min-w-[220px]">
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Mail Item ID:</div>
                                                            <div className="font-medium">#{item.id}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Customer Name / ID:</div>
                                                            <div className="font-medium">{userName}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {item.user_id}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Mail Description:</div>
                                                            <div className="font-medium">
                                                                {item.subject || '—'}{item.sender_name ? ` – ${item.sender_name}` : ''}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Receipt Date:</div>
                                                            <div className="font-medium">{formatDateDDMMYYYY(item.received_date, item.received_at_ms, item.created_at)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Destruction Eligibility Date:</div>
                                                            <div className="font-medium">{getDestructionEligibilityDate(item)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Physical Destruction Status:</div>
                                                            {(() => {
                                                                const eligibility = getDestructionEligibilityStatus(item);
                                                                return (
                                                                    <div className={eligibility.isEligible ? "font-medium text-amber-600" : "font-medium text-muted-foreground"}>
                                                                        {eligibility.label}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
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
                    </Card>
                </TabsContent>

                {/* All Mail Tab */}
                <TabsContent value="all" className="mt-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Processed</TableHead>
                                    <TableHead>Deletion Status</TableHead>
                                    <TableHead className="min-w-[250px]">Destruction Eligibility</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && allItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : allItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No mail items found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    allItems.map((item) => {
                                        const deletionStatus = getDeletionStatus(item);
                                        const userName = item.first_name || item.last_name
                                            ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                            : item.user_email || `User #${item.user_id}`;
                                        const isProcessed = item.status === 'processed' || item.status === 'forwarded';
                                        const canMarkDestroyed = item.past_30_days && !item.physical_destruction_date;

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className=""
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
                                                    {formatDate(item.received_date, item.received_at_ms, item.created_at)}
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
                                                        <Badge
                                                            variant={deletionStatus.variant === "destructive" ? "outline" : deletionStatus.variant}
                                                            className={deletionStatus.variant === "destructive" ? "border-0 bg-transparent " + deletionStatus.color : deletionStatus.color}
                                                        >
                                                            {deletionStatus.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-2 text-xs min-w-[220px]">
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Mail Item ID:</div>
                                                            <div className="font-medium">#{item.id}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Customer Name / ID:</div>
                                                            <div className="font-medium">{userName}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {item.user_id}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Mail Description:</div>
                                                            <div className="font-medium">
                                                                {item.subject || '—'}{item.sender_name ? ` – ${item.sender_name}` : ''}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Receipt Date:</div>
                                                            <div className="font-medium">{formatDateDDMMYYYY(item.received_date, item.received_at_ms, item.created_at)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Destruction Eligibility Date:</div>
                                                            <div className="font-medium">{getDestructionEligibilityDate(item)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground mb-0.5">Physical Destruction Status:</div>
                                                            {(() => {
                                                                const eligibility = getDestructionEligibilityStatus(item);
                                                                return (
                                                                    <div className={eligibility.isEligible ? "font-medium text-amber-600" : "font-medium text-muted-foreground"}>
                                                                        {eligibility.label}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
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
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
