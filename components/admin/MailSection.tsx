"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
    Filter,
    Plus,
    Eye,
    Edit,
    Truck,
    Tag,
    Trash2,
    Download,
    Search,
    RefreshCcw,
    Mail,
    Package,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
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

interface MailItem {
    id: number;
    userId: number;
    userName: string;
    sender: string;
    subject: string;
    tag: string;
    status: "received" | "pending" | "processed" | "forwarded";
    received: string;
    scanned?: boolean;
    forwarded?: boolean;
    trackingNumber?: string;
    weight?: string;
    dimensions?: string;
}

interface MailSectionProps { }

export function MailSection({ }: MailSectionProps) {
    const [selectedTab, setSelectedTab] = useState("received");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [tagFilter, setTagFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    // API Data fetching
    const { data: mailItems, isLoading: mailLoading, refetch: refetchMail } = useApiData('/api/admin/mail-items');
    const { data: mailStats, isLoading: statsLoading } = useApiData('/api/admin/mail-items/stats');

    const mailData = mailItems || [];
    const stats = mailStats as any;

    const filteredItems = mailData.filter((item: MailItem) => {
        const matchesSearch = item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesTag = tagFilter === "all" || item.tag === tagFilter;
        const matchesTab = selectedTab === "all" || item.status === selectedTab;
        return matchesSearch && matchesStatus && matchesTag && matchesTab;
    });

    const handleAddItem = async () => {
        try {
            await logAdminAction('admin_add_mail_item');
            // Open add mail item modal or navigate to add page
            window.open('/admin/mail/add', '_blank');
        } catch (error) {
            await logAdminAction('admin_add_mail_item_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleViewItem = async (itemId: number) => {
        try {
            await logAdminAction('admin_view_mail_item', { itemId });
            window.open(`/admin/mail/${itemId}`, '_blank');
        } catch (error) {
            await logAdminAction('admin_view_mail_item_error', { itemId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleEditItem = async (itemId: number) => {
        try {
            await logAdminAction('admin_edit_mail_item', { itemId });
            window.open(`/admin/mail/${itemId}/edit`, '_blank');
        } catch (error) {
            await logAdminAction('admin_edit_mail_item_error', { itemId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleProcessItem = async (itemId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_process_mail_item', { itemId });
            await apiClient.post(`/api/admin/mail-items/${itemId}/process`);
            refetchMail();
        } catch (error) {
            await logAdminAction('admin_process_mail_item_error', { itemId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleTagItem = async (itemId: number, tag: string) => {
        setLoading(true);
        try {
            await logAdminAction('admin_tag_mail_item', { itemId, tag });
            await apiClient.post(`/api/admin/mail-items/${itemId}/tag`, { tag });
            refetchMail();
        } catch (error) {
            await logAdminAction('admin_tag_mail_item_error', { itemId, tag, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleForwardItem = async (itemId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_forward_mail_item', { itemId });
            await apiClient.post(`/api/admin/mail-items/${itemId}/forward`);
            refetchMail();
        } catch (error) {
            await logAdminAction('admin_forward_mail_item_error', { itemId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_delete_mail_item', { itemId });
            await apiClient.delete(`/api/admin/mail-items/${itemId}`);
            refetchMail();
        } catch (error) {
            await logAdminAction('admin_delete_mail_item_error', { itemId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedItems.length === 0) return;

        setLoading(true);
        try {
            await logAdminAction('admin_bulk_mail_action', { action, itemIds: selectedItems });
            await apiClient.post(`/api/admin/mail-items/bulk/${action}`, { itemIds: selectedItems });
            setSelectedItems([]);
            refetchMail();
        } catch (error) {
            await logAdminAction('admin_bulk_mail_action_error', { action, itemIds: selectedItems, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleExportMail = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_mail', {
                filters: { statusFilter, tagFilter, searchTerm, tab: selectedTab }
            });

            const response = await apiClient.get(`/api/admin/mail-items/export?status=${statusFilter}&tag=${tagFilter}&search=${searchTerm}&tab=${selectedTab}`);

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mail-items-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_export_mail_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (itemId: number) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const selectAllItems = () => {
        setSelectedItems(filteredItems.map((item: MailItem) => item.id));
    };

    const clearSelection = () => {
        setSelectedItems([]);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "received": return <Mail className="h-4 w-4 text-blue-500" />;
            case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
            case "processed": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "forwarded": return <Truck className="h-4 w-4 text-purple-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Mail Management</h1>
                    <p className="text-muted-foreground">Process and manage incoming mail and packages</p>
                    {mailStats && (
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Total: {stats?.total || 0}</span>
                            <span>Received: {stats?.received || 0}</span>
                            <span>Pending: {stats?.pending || 0}</span>
                            <span>Processed: {stats?.processed || 0}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportMail}
                        disabled={loading}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={handleAddItem}
                        disabled={loading}
                    >
                        <Plus className="h-4 w-4" />
                        Add Item
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{selectedItems.length} items selected</span>
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
                                    <CheckCircle className="h-4 w-4" />
                                    Process
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('tag')}
                                    disabled={loading}
                                >
                                    <Tag className="h-4 w-4" />
                                    Tag
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('forward')}
                                    disabled={loading}
                                >
                                    <Truck className="h-4 w-4" />
                                    Forward
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('delete')}
                                    disabled={loading}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
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
                                    placeholder="Search mail items..."
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
                                    <SelectItem value="received">Received</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processed">Processed</SelectItem>
                                    <SelectItem value="forwarded">Forwarded</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={tagFilter} onValueChange={setTagFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    <SelectItem value="Government">Government</SelectItem>
                                    <SelectItem value="Financial">Financial</SelectItem>
                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                    <SelectItem value="Legal">Legal</SelectItem>
                                    <SelectItem value="Personal">Personal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="received">Received</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="processed">Processed</TabsTrigger>
                    <TabsTrigger value="forwarded">Forwarded</TabsTrigger>
                </TabsList>

                <TabsContent value="received" className="space-y-4">
                    <MailTable
                        items={filteredItems.filter((item: MailItem) => item.status === "received")}
                        onView={handleViewItem}
                        onEdit={handleEditItem}
                        onProcess={handleProcessItem}
                        onTag={handleTagItem}
                        onForward={handleForwardItem}
                        onDelete={handleDeleteItem}
                        onSelect={toggleItemSelection}
                        selectedItems={selectedItems}
                        loading={loading}
                    />
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <MailTable
                        items={filteredItems.filter((item: MailItem) => item.status === "pending")}
                        onView={handleViewItem}
                        onEdit={handleEditItem}
                        onProcess={handleProcessItem}
                        onTag={handleTagItem}
                        onForward={handleForwardItem}
                        onDelete={handleDeleteItem}
                        onSelect={toggleItemSelection}
                        selectedItems={selectedItems}
                        loading={loading}
                    />
                </TabsContent>

                <TabsContent value="processed" className="space-y-4">
                    <MailTable
                        items={filteredItems.filter((item: MailItem) => item.status === "processed")}
                        onView={handleViewItem}
                        onEdit={handleEditItem}
                        onProcess={handleProcessItem}
                        onTag={handleTagItem}
                        onForward={handleForwardItem}
                        onDelete={handleDeleteItem}
                        onSelect={toggleItemSelection}
                        selectedItems={selectedItems}
                        loading={loading}
                    />
                </TabsContent>

                <TabsContent value="forwarded" className="space-y-4">
                    <MailTable
                        items={filteredItems.filter((item: MailItem) => item.status === "forwarded")}
                        onView={handleViewItem}
                        onEdit={handleEditItem}
                        onProcess={handleProcessItem}
                        onTag={handleTagItem}
                        onForward={handleForwardItem}
                        onDelete={handleDeleteItem}
                        onSelect={toggleItemSelection}
                        selectedItems={selectedItems}
                        loading={loading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Mail Table Component
function MailTable({
    items,
    onView,
    onEdit,
    onProcess,
    onTag,
    onForward,
    onDelete,
    onSelect,
    selectedItems,
    loading
}: {
    items: MailItem[];
    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onProcess: (id: number) => void;
    onTag: (id: number, tag: string) => void;
    onForward: (id: number) => void;
    onDelete: (id: number) => void;
    onSelect: (id: number) => void;
    selectedItems: number[];
    loading: boolean;
}) {
    const selectAllItems = () => {
        items.forEach(item => {
            if (!selectedItems.includes(item.id)) {
                onSelect(item.id);
            }
        });
    };

    const clearSelection = () => {
        items.forEach(item => {
            if (selectedItems.includes(item.id)) {
                onSelect(item.id);
            }
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "received": return <Mail className="h-4 w-4 text-blue-500" />;
            case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
            case "processed": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "forwarded": return <Truck className="h-4 w-4 text-purple-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <input
                                type="checkbox"
                                checked={items.length > 0 && items.every(item => selectedItems.includes(item.id))}
                                onChange={items.length > 0 && items.every(item => selectedItems.includes(item.id)) ? clearSelection : selectAllItems}
                                className="rounded"
                            />
                        </TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No mail items found
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item.id)}
                                        onChange={() => onSelect(item.id)}
                                        className="rounded"
                                    />
                                </TableCell>
                                <TableCell>#{item.id}</TableCell>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{item.userName}</div>
                                        <div className="text-sm text-muted-foreground">ID: {item.userId}</div>
                                    </div>
                                </TableCell>
                                <TableCell>{item.sender}</TableCell>
                                <TableCell>{item.subject}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{item.tag}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(item.status)}
                                        <Badge variant="outline" className="capitalize">
                                            {item.status}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{item.received}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => onView(item.id)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => onEdit(item.id)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {item.status === "received" && (
                                            <Button size="sm" variant="outline" onClick={() => onProcess(item.id)} disabled={loading}>
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {item.status === "processed" && (
                                            <Button size="sm" variant="outline" onClick={() => onForward(item.id)} disabled={loading}>
                                                <Truck className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => onDelete(item.id)} disabled={loading}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
