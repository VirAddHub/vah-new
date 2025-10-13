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
    archived?: boolean;
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
    const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());

    // Helper function to handle button clicks with visual feedback
    const handleButtonClick = useCallback((buttonId: string, action: () => void) => {
        // Add visual feedback
        setClickedButtons(prev => new Set(prev).add(buttonId));
        
        // Execute the action
        action();
        
        // Remove visual feedback after 2 seconds
        setTimeout(() => {
            setClickedButtons(prev => {
                const newSet = new Set(prev);
                newSet.delete(buttonId);
                return newSet;
            });
        }, 2000);
    }, []);

    // Filter mail items based on active tab
    const filteredItems = useMemo(() => {
        let items = mailItems;

        // Filter by tab
        if (activeTab === "archived") {
            items = items.filter(item => item.archived);
        } else if (activeTab === "inbox") {
            items = items.filter(item => !item.archived);
        } else if (activeTab.startsWith("tag:")) {
            const tag = activeTab.replace("tag:", "");
            items = items.filter(item => item.tag === tag && !item.archived);
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

    // Get unique tags for tag tabs
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        mailItems.forEach(item => {
            if (item.tag && !item.archived) {
                tags.add(item.tag);
            }
        });
        return Array.from(tags).sort();
    }, [mailItems]);

    // Tag a mail item
    const handleTagItem = useCallback(async (item: MailItem, tag: string) => {
        if (!tag.trim()) return;

        setLoading(true);
        try {
            const token = getToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/mail-items/${item.id}/tag`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ tag: tag.trim() })
            });

            if (response.ok) {
                toast({
                    title: "Tag Added",
                    description: `Mail item tagged as "${tag}"`,
                    durationMs: 3000,
                });
                onRefresh();
                setShowTagDialog(false);
                setNewTag("");
            } else {
                throw new Error('Failed to add tag');
            }
        } catch (error) {
            console.error('Error adding tag:', error);
            toast({
                title: "Error",
                description: "Failed to add tag. Please try again.",
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
                            {item.archived && (
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
                                    <DialogTitle>Add Tag</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="tag">Tag Name</Label>
                                        <Input
                                            id="tag"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder="Enter tag name..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && selectedItem) {
                                                    handleTagItem(selectedItem, newTag);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                <Button
                                    onClick={() => selectedItem && handleButtonClick(`tag-${selectedItem.id}`, () => handleTagItem(selectedItem, newTag))}
                                    disabled={!newTag.trim() || loading}
                                    className={clickedButtons.has(`tag-${selectedItem?.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                                >
                                    Add Tag
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
                        {item.archived ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleButtonClick(`restore-${item.id}`, () => handleRestoreItem(item))}
                                disabled={loading}
                                className={clickedButtons.has(`restore-${item.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                            >
                                <ArchiveRestore className="h-4 w-4 mr-1" />
                                Restore
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleButtonClick(`archive-${item.id}`, () => handleArchiveItem(item))}
                                disabled={loading}
                                className={clickedButtons.has(`archive-${item.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                            >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                            </Button>
                        )}

                        {/* Forward Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleButtonClick(`forward-${item.id}`, () => {
                                if (onForward) {
                                    onForward(item);
                                } else {
                                    // Fallback to direct API call if no onForward prop provided
                                    handleForwardItem(item);
                                }
                            })}
                            className={clickedButtons.has(`forward-${item.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                        >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Forward
                        </Button>

                        {/* View Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleButtonClick(`open-${item.id}`, () => onOpen(item))}
                            className={clickedButtons.has(`open-${item.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Open
                        </Button>

                        {/* Download Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleButtonClick(`download-${item.id}`, () => onDownload(item))}
                            className={clickedButtons.has(`download-${item.id}`) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
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
                        Inbox ({mailItems.filter(item => !item.archived).length})
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Archived ({mailItems.filter(item => item.archived).length})
                    </TabsTrigger>
                    <TabsTrigger value="tags" className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags ({availableTags.length})
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

                {/* Tags Tab */}
                <TabsContent value="tags" className="space-y-4">
                    {availableTags.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No tags yet</h3>
                                <p className="text-muted-foreground">
                                    Add tags to your mail items to organize them better.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {availableTags.map(tag => (
                                <div key={tag}>
                                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        {tag}
                                        <Badge variant="secondary" className="text-xs">
                                            {mailItems.filter(item => item.tag === tag && !item.archived).length}
                                        </Badge>
                                    </h3>
                                    <div className="space-y-2">
                                        {mailItems
                                            .filter(item => item.tag === tag && !item.archived)
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
