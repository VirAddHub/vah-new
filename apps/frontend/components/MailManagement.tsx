"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Archive, Mail, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { MailItemCard } from "./dashboard/mail/MailItemCard";
import { CreatableTagSelect } from "./dashboard/user/CreatableTagSelect";
import { getTagColor } from "./dashboard/user/TagDot";
import { useToast } from "./ui/use-toast";
import { useTags } from "@/hooks/useDashboardData";
import { getMailItemPrimaryLabel, mailItemMatchesSearchQuery } from '@/lib/mailItemDates';
import { cn } from "@/lib/utils";
import type { MailItem } from './dashboard/user/types';

interface MailManagementProps {
    mailItems: MailItem[];
    onRefresh: () => void;
    onOpen: (item: MailItem) => void;
    onDownload: (item: MailItem) => void;
    onForward?: (item: MailItem) => void;
    formatScannedDate: (item: MailItem) => string | null;
}

export function MailManagement({
    mailItems,
    onRefresh,
    onOpen,
    onDownload,
    onForward,
    formatScannedDate: _formatScannedDate,
}: MailManagementProps) {
    void _formatScannedDate;
    void onDownload;
    void onForward;
    const { toast } = useToast();
    const { data: tagsData, mutate: mutateTags } = useTags();
    const [activeTab, setActiveTab] = useState<"inbox" | "archived" | "tags">("inbox");
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());

    const availableTags = useMemo(() => {
        if (!tagsData?.ok) return [];
        return Array.isArray(tagsData.tags) ? tagsData.tags : [];
    }, [tagsData]);
    const tagsCount = availableTags.length;

    const tagMeta: Record<string, { label: string }> = {
        hmrc: { label: "HMRC" },
        companies_house: { label: "Companies House" },
        companieshouse: { label: "Companies House" },
        bank: { label: "Bank" },
        insurance: { label: "Insurance" },
        utilities: { label: "Utilities" },
        other: { label: "Other" },
    };

    const humanizeTag = useCallback((slug: string): string => {
        return slug
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    const getTagLabel = useCallback((t: string | null | undefined): string => {
        if (!t) return "Add tag";
        return tagMeta[t]?.label || humanizeTag(t);
    }, [humanizeTag]);

    const filteredItems = useMemo(() => {
        let items = mailItems;

        if (activeTab === "archived") {
            items = items.filter(item => item.deleted);
        } else if (activeTab === "inbox") {
            items = items.filter(item => !item.deleted);
            if (selectedTagFilter) {
                if (selectedTagFilter === "untagged") {
                    items = items.filter(item => !item.tag);
                } else {
                    items = items.filter(item => item.tag === selectedTagFilter);
                }
            }
        } else {
            items = items.filter(item => !item.deleted);
        }

        if (searchQuery.trim()) {
            items = items.filter((item) => mailItemMatchesSearchQuery(item, searchQuery));
        }

        return items;
    }, [mailItems, activeTab, searchQuery, selectedTagFilter]);

    const groupedByTag = useMemo(() => {
        if (activeTab !== "tags") return null;
        const groups: Record<string, MailItem[]> = {};
        filteredItems.forEach((item) => {
            const t = item.tag || "untagged";
            if (!groups[t]) groups[t] = [];
            groups[t].push(item);
        });
        const sortedTags = Object.keys(groups).sort((a, b) => {
            if (a === "untagged") return 1;
            if (b === "untagged") return -1;
            return a.localeCompare(b);
        });
        return sortedTags.map(t => ({ tag: t, items: groups[t], count: groups[t].length }));
    }, [filteredItems, activeTab]);

    const handleTagHeaderClick = useCallback((t: string) => {
        setSelectedTagFilter(t);
        setActiveTab("inbox");
    }, []);

    const toggleTagCollapse = useCallback((t: string) => {
        setCollapsedTags(prev => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t);
            else next.add(t);
            return next;
        });
    }, []);

    const handleTagUpdate = useCallback(async (item: MailItem, newTag: string | null) => {
        const currentTag = item.tag || null;
        const normalizedNewTag = newTag || null;
        if (currentTag === normalizedNewTag) return;

        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ tag: normalizedNewTag }),
            });
            const data = await response.json();
            if (response.ok) {
                await Promise.all([onRefresh(), mutateTags()]);
                return;
            }
            if (data.error === "no_changes") {
                await onRefresh();
                return;
            }
            throw new Error(data.error || "Failed to update tag");
        } catch (e) {
            console.error(e);
            toast({
                title: "Update failed",
                description: "Could not update tag. Try again.",
                variant: "destructive",
                durationMs: 4000,
            });
            await onRefresh();
        }
    }, [onRefresh, mutateTags, toast]);

    const renderMailItem = (item: MailItem) => {
        const primaryLabel = getMailItemPrimaryLabel(item);

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
            const sender = (item.sender_name || "").toLowerCase();
            const subj = (item.subject || "").toLowerCase();
            const s = `${tag} ${sender} ${subj}`;
            if (s.includes("bank") || s.includes("barclays") || s.includes("hsbc") || s.includes("lloyds")) return "bank";
            if (s.includes("hmrc") || s.includes("companies house") || s.includes("gov")) return "gov";
            return "file";
        })();

        return (
            <div key={item.id} className="mb-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <MailItemCard
                    sender={primaryLabel}
                    timeLabel={undefined}
                    statusLabel={statusLabel}
                    statusVariant={statusVariant}
                    mailType={mailType}
                    isRead={item.is_read ?? true}
                    onOpen={() => onOpen(item)}
                />
                <div
                    className="flex flex-wrap items-center justify-end gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-t border-border bg-muted/15"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    <CreatableTagSelect
                        compact
                        value={item.tag ?? null}
                        availableTags={availableTags}
                        onValueChange={(v) => handleTagUpdate(item, v)}
                        getTagLabel={getTagLabel}
                        className="w-auto shrink-0"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="hidden md:block">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search mail by sender, subject, tag, or date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-lg border-border bg-card focus:border-primary focus:ring-primary/20"
                    />
                </div>
            </div>

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
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search mail…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-lg border-border bg-card focus:border-primary focus:ring-primary/20"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant={activeTab === "inbox" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => { setActiveTab("inbox"); setShowFilters(false); }}
                            >
                                Inbox
                            </Button>
                            <Button
                                type="button"
                                variant={activeTab === "archived" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => { setActiveTab("archived"); setShowFilters(false); }}
                            >
                                Archived
                            </Button>
                            <Button
                                type="button"
                                variant={activeTab === "tags" ? "primary" : "outline"}
                                size="sm"
                                onClick={() => { setActiveTab("tags"); setShowFilters(false); }}
                            >
                                Tags
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Tabs
                value={activeTab}
                onValueChange={(v) => {
                    setActiveTab(v as "inbox" | "archived" | "tags");
                    if (v !== "inbox") setSelectedTagFilter(null);
                }}
                className="w-full"
            >
                <TabsList className="hidden md:flex h-auto p-0 bg-transparent border-b border-border rounded-none w-full justify-start gap-6">
                    <TabsTrigger
                        value="inbox"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        Inbox ({mailItems.filter(item => !item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="archived"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                        <Archive className="h-4 w-4" />
                        Archived ({mailItems.filter(item => item.deleted).length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="tags"
                        className="flex items-center gap-2 px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                        <Tag className="h-4 w-4" />
                        Tags ({tagsCount})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="mt-6 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-body-lg font-medium text-foreground mb-2">No mail items</h3>
                            <p className="text-body-sm text-muted-foreground">
                                {searchQuery ? 'No items match your search.' : 'Your inbox is empty.'}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                <TabsContent value="archived" className="mt-6 space-y-3">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center">
                            <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-body-lg font-medium text-foreground mb-2">No archived items</h3>
                            <p className="text-body-sm text-muted-foreground">
                                {searchQuery ? 'No archived items match your search.' : 'You haven\'t archived any mail yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map(renderMailItem)
                    )}
                </TabsContent>

                <TabsContent value="tags" className="mt-6 space-y-6">
                    {!groupedByTag || groupedByTag.length === 0 ? (
                        <div className="py-12 text-center">
                            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-body-lg font-medium text-foreground mb-2">No mail to group</h3>
                            <p className="text-body-sm text-muted-foreground">Your tagged mail will appear here.</p>
                        </div>
                    ) : (
                        groupedByTag.map(({ tag: groupTag, items, count }) => {
                            const isCollapsed = collapsedTags.has(groupTag);
                            return (
                                <div key={groupTag} className="space-y-3">
                                    <div className="flex items-center gap-3 border-b border-border pb-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleTagCollapse(groupTag)}
                                            className="p-1.5 hover:bg-muted rounded-md"
                                            aria-label={isCollapsed ? "Expand" : "Collapse"}
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTagHeaderClick(groupTag)}
                                            className="flex flex-1 items-center gap-2 text-left"
                                        >
                                            <div className={cn("h-2 w-2 rounded-full shrink-0", getTagColor(groupTag))} />
                                            <span className="font-semibold text-foreground">
                                                {groupTag === "untagged" ? "Untagged" : getTagLabel(groupTag)}
                                            </span>
                                            <span className="text-body-sm text-muted-foreground">{count} items</span>
                                        </button>
                                    </div>
                                    {!isCollapsed && <div className="space-y-0">{items.map(renderMailItem)}</div>}
                                </div>
                            );
                        })
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
