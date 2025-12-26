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
import { MailItemCard } from "./dashboard/mail/MailItemCard";
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
    const [showFilters, setShowFilters] = useState(false);
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
        } else if (activeTab.startsWith("tag:")) {
            const tag = activeTab.replace("tag:", "");
            items = items.filter(item => item.tag === tag && !item.deleted);
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

    // Tag mapping: slug -> display label
    const tagMeta: Record<string, { label: string; color: string }> = {
        hmrc: { label: "HMRC", color: "green" },
        companies_house: { label: "Companies House", color: "green" },
        bank: { label: "Bank", color: "amber" },
        insurance: { label: "Insurance", color: "blue" },
        utilities: { label: "Utilities", color: "purple" },
        other: { label: "Other", color: "slate" },
    };

    // Get unique tags for tag tabs
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        mailItems.forEach(item => {
            if (item.tag && !item.deleted) {
                tags.add(item.tag);
            }
        });
        return Array.from(tags).sort();
    }, [mailItems]);

    // Get tag display label
    const getTagLabel = useCallback((tag: string | null | undefined): string => {
        if (!tag) return "Untagged";
        return tagMeta[tag]?.label || tag;
    }, []);

    // Update mail item tag
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
                    title: "Tag Updated",
                    description: `Mail item tagged as "${getTagLabel(tag.trim())}"`,
                    durationMs: 3000,
                });
                onRefresh();
                setShowTagDialog(false);
                setNewTag("");
            } else {
                throw new Error('Failed to update tag');
            }
        } catch (error) {
            console.error('Error updating tag:', error);
            toast({
                title: "Error",
                description: "Failed to update tag. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [onRefresh, toast, getTagLabel]);

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
            // Use BFF endpoint which handles CSRF tokens automatically
            const response = await fetch('/api/bff/forwarding/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
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

    const renderMailItem = (item: MailItem) => {
        const title = String((item as any).user_title || item.subject || "Mail item").trim();
        const sender = title || "Mail item";
        const subject = "";

        const rawDate = item.received_date || item.created_at;
        const dateObj = rawDate ? new Date(rawDate) : null;

        const timeLabel = (() => {
            if (!dateObj || Number.isNaN(dateObj.getTime())) return '';
            const now = new Date();
            const sameDay =
                dateObj.getFullYear() === now.getFullYear() &&
                dateObj.getMonth() === now.getMonth() &&
                dateObj.getDate() === now.getDate();

            if (sameDay) {
                return dateObj.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
            }

            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday =
                dateObj.getFullYear() === yesterday.getFullYear() &&
                dateObj.getMonth() === yesterday.getMonth() &&
                dateObj.getDate() === yesterday.getDate();
            if (isYesterday) return 'Yesterday';

            return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        })();

        const statusVariant: "new" | "scanned" | "forwarded" | "neutral" = (() => {
            const raw = (item.status || "").toLowerCase();
            if (raw.includes("forward")) return "forwarded";
            if (item.scanned_at || item.file_url || raw.includes("scan")) return "scanned";
            if (!(item.is_read ?? true)) return "new";
            return "neutral";
        })();

        const statusLabel: "New" | "Scanned" | "Forwarded" | "Received" =
            statusVariant === "new"
                ? "New"
                : statusVariant === "scanned"
                    ? "Scanned"
                    : statusVariant === "forwarded"
                        ? "Forwarded"
                        : "Received";

        const mailType: "gov" | "bank" | "file" = (() => {
            const tag = (item.tag || "").toLowerCase();
            const s = `${tag} ${(item.sender_name || "").toLowerCase()} ${(item.subject || "").toLowerCase()}`;
            if (s.includes("bank") || s.includes("barclays") || s.includes("hsbc") || s.includes("lloyds")) return "bank";
            if (s.includes("hmrc") || s.includes("companies house") || s.includes("gov")) return "gov";
            return "file";
        })();

        return (
            <div key={item.id} className="mb-3">
                {/* Tag Dialog - kept separate for functionality */}
                <Dialog open={showTagDialog && selectedItem?.id === item.id} onOpenChange={(open) => {
                    if (!open) {
                        setShowTagDialog(false);
                        setSelectedItem(null);
                        setNewTag("");
                    }
                }}>
                    <MailItemCard
                        sender={sender}
                        timeLabel={undefined}
                        statusLabel={statusLabel}
                        statusVariant={statusVariant}
                        mailType={mailType}
                        isRead={item.is_read ?? true}
                        onOpen={() => onOpen(item)}
                    />
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Tag</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="tag">Select or Create Tag</Label>
                                <div className="space-y-2">
                                    <Select
                                        value={newTag}
                                        onValueChange={(value) => {
                                            setNewTag(value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an existing tag or type new one below" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(tagMeta).map(([slug, meta]) => (
                                                <SelectItem key={slug} value={slug}>
                                                    {meta.label}
                                                </SelectItem>
                                            ))}
                                            {availableTags.filter(tag => !tagMeta[tag]).map((tag) => (
                                                <SelectItem key={tag} value={tag}>
                                                    {getTagLabel(tag)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="text-xs text-muted-foreground">
                                        Or type a new tag slug (e.g., "hmrc", "companies_house", "bank"):
                                    </div>
                                    <Input
                                        id="tag"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Enter tag slug..."
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
                                    Update Tag
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
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Desktop: Search + inline tabs */}
            <div className="hidden md:block">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                        placeholder="Search mail by sender, subject, tag, or date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-lg border-neutral-200 bg-white focus:border-primary focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Mobile: filter modal is opened by an external button (Dashboard header) */}
            <button
                id="mail-filters-open"
                type="button"
                className="hidden"
                onClick={() => setShowFilters(true)}
                aria-hidden="true"
                tabIndex={-1}
            />

            <Dialog open={showFilters} onOpenChange={setShowFilters}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-4 py-4 border-b">
                        <DialogTitle>Filters</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        {/* Search inside filter modal */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Search mail…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-lg border-neutral-200 bg-white focus:border-primary focus:ring-primary/20"
                            />
                        </div>

                        {/* Tab picker */}
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant={activeTab === "inbox" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab("inbox")}
                            >
                                Inbox
                            </Button>
                            <Button
                                type="button"
                                variant={activeTab === "archived" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab("archived")}
                            >
                                Archived
                            </Button>
                            <Button
                                type="button"
                                variant={activeTab.startsWith("tag:") || activeTab === "tags" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab("tags")}
                            >
                                Tags
                            </Button>
                        </div>

                        {/* Tag list (re-uses existing tag state) */}
                        {availableTags.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-neutral-600">Tags</div>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setActiveTab(`tag:${tag}`)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${activeTab === `tag:${tag}`
                                                ? "bg-primary text-white border-primary"
                                                : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                                                }`}
                                        >
                                            {getTagLabel(tag)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Tabs (content always renders; controls differ mobile/desktop) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="hidden md:flex h-auto p-0 bg-transparent border-b border-neutral-200 rounded-none w-full justify-start gap-6">
                    <TabsTrigger
                        value="inbox"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-neutral-500 data-[state=active]:bg-transparent hover:text-neutral-700 transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        Inbox ({mailItems.filter(item => !item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="archived"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-neutral-500 data-[state=active]:bg-transparent hover:text-neutral-700 transition-colors"
                    >
                        <Archive className="h-4 w-4" />
                        Archived ({mailItems.filter(item => item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="tags"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-neutral-500 data-[state=active]:bg-transparent hover:text-neutral-700 transition-colors"
                    >
                        <Tag className="h-4 w-4" />
                        Tags ({availableTags.length})
                    </TabsTrigger>
                </TabsList>

                {/* Inbox Tab */}
                <TabsContent value="inbox" className="mt-6 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <Mail className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                            <h3 className="text-lg font-medium text-neutral-800 mb-2">No mail items</h3>
                            <p className="text-sm text-neutral-500">
                                {searchQuery ? 'No items match your search.' : 'Your inbox is empty.'}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                {/* Archived Tab */}
                <TabsContent value="archived" className="mt-6 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <Archive className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                            <h3 className="text-lg font-medium text-neutral-800 mb-2">No archived items</h3>
                            <p className="text-sm text-neutral-500">
                                {searchQuery ? 'No archived items match your search.' : 'You haven\'t archived any mail yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                {/* Tags Tab */}
                <TabsContent value="tags" className="mt-6 space-y-6">
                    {availableTags.length === 0 ? (
                        <div className="py-12 text-center">
                            <Tag className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                            <h3 className="text-lg font-medium text-neutral-800 mb-2">No tags yet</h3>
                            <p className="text-sm text-neutral-500">
                                Add tags to your mail items to organize them better.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {availableTags.map(tag => (
                                <div key={tag}>
                                    <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-primary" />
                                        {getTagLabel(tag)}
                                        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                                            {mailItems.filter(item => item.tag === tag && !item.deleted).length}
                                        </Badge>
                                    </h3>
                                    <div className="space-y-3">
                                        {mailItems
                                            .filter(item => item.tag === tag && !item.deleted)
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
