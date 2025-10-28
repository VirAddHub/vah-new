"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
    Plus,
    Search,
    Archive,
    Tag,
    Mail,
    ArchiveRestore,
    Trash2,
    Eye,
    Download,
    Calendar,
    FileCheck,
    ArrowRight
} from "lucide-react";
import { useToast } from "./ui/use-toast";
import { getToken } from '@/lib/token-manager';

interface MailItem {
    id: string | number;
    subject?: string;
    sender_name?: string;
    received_date?: string;
    status?: string;
    tag?: string;
    is_read?: boolean;
    created_at?: string;
    scanned_at?: string;
    file_url?: string;
    deleted?: boolean; // Backend uses 'deleted' field
}

interface MailManagementProps {
    mailItems: MailItem[];
    onRefresh: () => void;
    onOpen: (item: MailItem) => void;
    onDownload: (item: MailItem) => void;
    onForward?: (item: MailItem) => void;
    formatScannedDate: (item: MailItem) => string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export function MailManagement({
    mailItems,
    onRefresh,
    onOpen,
    onDownload,
    onForward,
    formatScannedDate
}: MailManagementProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("inbox");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<MailItem | null>(null);
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [loading, setLoading] = useState(false);
    // Remove temporary visual-feedback click handling; use direct handlers instead

    // Filter mail items based on active tab
    const filteredItems = useMemo(() => {
        let items = mailItems;

        // Filter by tab - backend uses 'deleted' field to indicate archived status
        if (activeTab === "archived") {
            items = items.filter(item => item.deleted);
        } else if (activeTab === "inbox") {
            items = items.filter(item => !item.deleted);
        } else if (activeTab.startsWith("subject:")) {
            const subject = activeTab.replace("subject:", "");
            items = items.filter(item => item.subject === subject && !item.deleted);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item =>
                item.subject?.toLowerCase().includes(query) ||
                item.sender_name?.toLowerCase().includes(query) ||
                item.tag?.toLowerCase().includes(query) ||
                item.received_date?.toLowerCase().includes(query)
            );
        }

        return items;
    }, [mailItems, activeTab, searchQuery]);

    // Get unique subjects for tag tabs
    const availableSubjects = useMemo(() => {
        const subjects = new Set<string>();
        mailItems.forEach(item => {
            if (item.subject && !item.deleted) {
                subjects.add(item.subject);
            }
        });
        return Array.from(subjects).sort();
    }, [mailItems]);

    // Update mail item subject
    const handleTagItem = useCallback(async (item: MailItem, subject: string) => {
        if (!subject.trim()) return;

        setLoading(true);
        try {
            const token = getToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/mail-items/${item.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ subject: subject.trim() })
            });

            if (response.ok) {
                toast({
                    title: "Subject Updated",
                    description: `Mail item subject updated to "${subject}"`,
                    durationMs: 3000,
                });
                onRefresh();
                setShowTagDialog(false);
                setNewTag("");
            } else {
                throw new Error('Failed to update subject');
            }
        } catch (error) {
            console.error('Error updating subject:', error);
            toast({
                title: "Error",
                description: "Failed to update subject. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [onRefresh, toast]);

    // Archive a mail item
    const handleArchiveItem = useCallback(async (item: MailItem) => {
        setLoading(true);
        try {
            const token = getToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/mail-items/${item.id}`, {
                method: 'DELETE',
                headers
            });

            if (response.ok) {
                toast({
                    title: "Mail Archived",
                    description: "Mail item has been moved to archive",
                    durationMs: 3000,
                });
                onRefresh();
            } else {
                throw new Error('Failed to archive mail');
            }
        } catch (error) {
            console.error('Error archiving mail:', error);
            toast({
                title: "Error",
                description: "Failed to archive mail. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [onRefresh, toast]);

    // Restore archived mail
    const handleRestoreItem = useCallback(async (item: MailItem) => {
        setLoading(true);
        try {
            const token = getToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/mail-items/${item.id}/restore`, {
                method: 'POST',
                headers
            });

            if (response.ok) {
                toast({
                    title: "Mail Restored",
                    description: "Mail item has been restored to inbox",
                    durationMs: 3000,
                });
                onRefresh();
            } else {
                throw new Error('Failed to restore mail');
            }
        } catch (error) {
            console.error('Error restoring mail:', error);
            toast({
                title: "Error",
                description: "Failed to restore mail. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [onRefresh, toast]);

    // Forward a mail item
    const handleForwardItem = useCallback(async (item: MailItem) => {
        setLoading(true);
        try {
            const token = getToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/forwarding/requests`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    mail_item_ids: [item.id],
                    notes: `Forward request for mail item ${item.id}`
                })
            });

            if (response.ok) {
                toast({
                    title: "Forward Request Created",
                    description: `Mail item ${item.id} has been requested for forwarding`,
                    durationMs: 3000,
                });
                onRefresh();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create forward request');
            }
        } catch (error) {
            console.error('Error creating forward request:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create forward request. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [onRefresh, toast]);

    const renderMailItem = (item: MailItem) => (
        <Card key={item.id} className="mb-3 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Mail Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium truncate">
                                {item.tag || 'Inbox Item'}
                            </h4>
                            {!item.is_read && (
                                <Badge variant="default" className="text-xs">New</Badge>
                            )}
                            {item.deleted && (
                                <Badge variant="outline" className="text-xs">Archived</Badge>
                            )}
                        </div>

                        {item.received_date && (
                            <p className="text-sm text-muted-foreground">
                                {new Date(item.received_date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Tag Button */}
                        <Dialog open={showTagDialog && selectedItem?.id === item.id} onOpenChange={(open) => {
                            if (!open) {
                                setShowTagDialog(false);
                                setSelectedItem(null);
                                setNewTag("");
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setShowTagDialog(true);
                                    }}
                                    disabled={loading}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    <Tag className="h-4 w-4 mr-1" />
                                    Tag
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Update Subject</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="subject">Select or Create Subject</Label>
                                        <div className="space-y-2">
                                            <Select
                                                value={newTag}
                                                onValueChange={(value) => {
                                                    setNewTag(value);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an existing subject or type new one below" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableSubjects.map((subject) => (
                                                        <SelectItem key={subject} value={subject}>
                                                            {subject}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="text-xs text-muted-foreground">
                                                Or type a new subject name:
                                            </div>
                                            <Input
                                                id="subject"
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="Enter new subject..."
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && selectedItem && newTag.trim()) {
                                                        handleTagItem(selectedItem, newTag);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => selectedItem && handleTagItem(selectedItem, newTag)}
                                            disabled={!newTag.trim() || loading}
                                        >
                                            Update Subject
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowTagDialog(false);
                                                setSelectedItem(null);
                                                setNewTag("");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Archive/Restore Button */}
                        {item.deleted ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreItem(item)}
                                disabled={loading}
                            >
                                <ArchiveRestore className="h-4 w-4 mr-1" />
                                Restore
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchiveItem(item)}
                                disabled={loading}
                            >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                            </Button>
                        )}

                        {/* Forward Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (onForward) {
                                    onForward(item);
                                } else {
                                    handleForwardItem(item);
                                }
                            }}
                        >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Forward
                        </Button>

                        {/* View Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpen(item)}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Open
                        </Button>

                        {/* Download Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownload(item)}
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search mail by sender, subject, tag, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="inbox" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Inbox ({mailItems.filter(item => !item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Archived ({mailItems.filter(item => item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger value="subjects" className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags ({availableSubjects.length})
                    </TabsTrigger>
                </TabsList>

                {/* Inbox Tab */}
                <TabsContent value="inbox" className="space-y-4">
                    {filteredItems.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No mail items</h3>
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'No items match your search.' : 'Your inbox is empty.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                {/* Archived Tab */}
                <TabsContent value="archived" className="space-y-4">
                    {filteredItems.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No archived items</h3>
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'No archived items match your search.' : 'You haven\'t archived any mail yet.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                {/* Subjects Tab */}
                <TabsContent value="subjects" className="space-y-4">
                    {availableSubjects.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No subjects yet</h3>
                                <p className="text-muted-foreground">
                                    Add subjects to your mail items to organize them better.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {availableSubjects.map(subject => (
                                <div key={subject}>
                                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        {subject}
                                        <Badge variant="secondary" className="text-xs">
                                            {mailItems.filter(item => item.subject === subject && !item.deleted).length}
                                        </Badge>
                                    </h3>
                                    <div className="space-y-2">
                                        {mailItems
                                            .filter(item => item.subject === subject && !item.deleted)
                                            .map(renderMailItem)
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
