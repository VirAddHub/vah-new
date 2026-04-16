'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { useMail, useTags, useProfile } from '@/hooks/useDashboardData';
import { useActiveBusiness } from '@/contexts/ActiveBusinessContext';
import { Building2, FileText, Landmark, Search, ChevronDown, ChevronRight, Tag, X, Archive, ArchiveRestore, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { MailDetail } from '@/components/dashboard/user/MailDetail';
import PDFViewerModal from '@/components/PDFViewerModal';
import { ForwardingRequestModal } from '@/components/ForwardingRequestModal';
import { useToast } from '@/components/ui/use-toast';
import type { MailItem } from '@/components/dashboard/user/types';
import { CreatableTagSelect } from '@/components/dashboard/user/CreatableTagSelect';
import { TagDot, getTagColor } from '@/components/dashboard/user/TagDot';
import { getMailItemPrimaryLabel, mailItemMatchesSearchQuery } from '@/lib/mailItemDates';

export default function MailInboxPage() {
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const { isMobileSidebarOpen } = useDashboardView();
    const { activeBusinessId } = useActiveBusiness();
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());

    // Mail detail state - in-place replacement view
    const [selectedMailDetail, setSelectedMailDetail] = useState<MailItem | null>(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [selectedMailForPDF, setSelectedMailForPDF] = useState<MailItem | null>(null);
    const [miniViewerUrl, setMiniViewerUrl] = useState<string | null>(null);
    const [miniViewerLoading, setMiniViewerLoading] = useState(false);
    const [miniViewerError, setMiniViewerError] = useState<string | null>(null);
    const [forwardInlineNotice, setForwardInlineNotice] = useState<string | null>(null);
    const [showForwardingModal, setShowForwardingModal] = useState(false);
    const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const { toast } = useToast();

    // Fetch mail items for the active business
    const { data: mailData, error: mailError, isLoading: mailLoading, mutate: mutateMailItems } = useMail(activeBusinessId ?? undefined);
    const { data: tagsData, mutate: mutateTags } = useTags();

    // Fetch profile for forwarding address using stable hook
    const { data: profileData } = useProfile();
    const profile = profileData?.data;

    // 🔍 STEP 3: Log frontend profile fetch (mail page)
    if (profileData) {
        console.log("🟣 PROFILE FROM API (Mail Page):", profile);
        console.log("🟣 forwarding_address:", profile?.forwarding_address);
        console.log("🟣 forwardingAddress:", profile?.forwardingAddress);
    }

    const mailItems = useMemo(() => {
        if (!mailData?.ok) return [];
        return Array.isArray(mailData.items) ? mailData.items : [];
    }, [mailData]);

    const filteredItems = useMemo(() => {
        let items: MailItem[] = mailItems;

        if (activeTab === 'archived') {
            items = items.filter((item: MailItem) => item.deleted);
        } else if (activeTab === 'inbox') {
            items = items.filter((item: MailItem) => !item.deleted);
            if (selectedTagFilter) {
                if (selectedTagFilter === 'untagged') {
                    items = items.filter((item: MailItem) => !item.tag);
                } else {
                    items = items.filter((item: MailItem) => item.tag === selectedTagFilter);
                }
            }
        } else if (activeTab === 'tags') {
            items = items.filter((item: MailItem) => !item.deleted);
        }

        if (searchQuery.trim()) {
            items = items.filter((item: MailItem) => mailItemMatchesSearchQuery(item, searchQuery));
        }

        return items;
    }, [mailItems, activeTab, searchQuery, selectedTagFilter]);

    const inboxCount = mailItems.filter((item: MailItem) => !item.deleted).length;
    const archivedCount = mailItems.filter((item: MailItem) => item.deleted).length;
    const availableTags = useMemo(() => {
        if (!tagsData?.ok) return [];
        return Array.isArray(tagsData.tags) ? tagsData.tags : [];
    }, [tagsData]);
    const tagsCount = availableTags.length;

    const tagMeta: Record<string, { label: string }> = {
        hmrc: { label: 'HMRC' },
        companies_house: { label: 'Companies House' },
        companieshouse: { label: 'Companies House' },
        bank: { label: 'Bank' },
        insurance: { label: 'Insurance' },
        utilities: { label: 'Utilities' },
        other: { label: 'Other' },
    };

    const humanizeTag = useCallback((slug: string): string => {
        return slug
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    const getTagLabel = useCallback(
        (t: string | null | undefined): string => {
            if (!t) return 'Add tag';
            return tagMeta[t]?.label || humanizeTag(t);
        },
        [humanizeTag]
    );

    const handleTagHeaderClick = useCallback((t: string) => {
        setSelectedTagFilter(t);
        setActiveTab('inbox');
    }, []);

    const clearTagFilter = useCallback(() => setSelectedTagFilter(null), []);

    const toggleTagCollapse = useCallback((t: string) => {
        setCollapsedTags((prev) => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t);
            else next.add(t);
            return next;
        });
    }, []);

    const handleCollapseToggle = useCallback(
        (t: string, event: React.MouseEvent) => {
            event.stopPropagation();
            toggleTagCollapse(t);
        },
        [toggleTagCollapse]
    );

    const groupedByTag = useMemo(() => {
        if (activeTab !== 'tags') return null;
        const groups: Record<string, MailItem[]> = {};
        filteredItems.forEach((item: MailItem) => {
            const t = item.tag || 'untagged';
            if (!groups[t]) groups[t] = [];
            groups[t].push(item);
        });
        const sortedTags = Object.keys(groups).sort((a, b) => {
            if (a === 'untagged') return 1;
            if (b === 'untagged') return -1;
            return a.localeCompare(b);
        });
        return sortedTags.map((t) => ({ tag: t, items: groups[t], count: groups[t].length }));
    }, [filteredItems, activeTab]);

    const patchMailItemsCache = useCallback(
        (updater: (items: MailItem[]) => MailItem[]) => {
            if (!mailData?.ok || !Array.isArray(mailData.items)) return;
            mutateMailItems({ ...mailData, items: updater(mailData.items) }, false);
        },
        [mailData, mutateMailItems]
    );

    const handleTagUpdate = useCallback(
        async (item: MailItem, newTag: string | null) => {
            const currentTag = item.tag || null;
            const normalizedNewTag = newTag || null;
            if (currentTag === normalizedNewTag) return;

            patchMailItemsCache((items) =>
                items.map((m: MailItem) =>
                    m.id === item.id ? { ...m, tag: normalizedNewTag ?? undefined } : m
                )
            );

            try {
                const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ tag: normalizedNewTag }),
                });
                const data = await response.json();
                if (response.ok) {
                    await Promise.all([mutateMailItems(), mutateTags()]);
                    return;
                }
                if (data.error === 'no_changes') {
                    await mutateMailItems();
                    return;
                }
                await mutateMailItems();
                throw new Error(data.error || 'Failed to update tag');
            } catch (error) {
                console.error('Error updating tag:', error);
                await mutateMailItems();
                toast({
                    title: 'Update Failed',
                    description: 'Failed to update tag. Please try again.',
                    variant: 'destructive',
                    durationMs: 3000,
                });
            }
        },
        [toast, patchMailItemsCache, mutateMailItems, mutateTags]
    );

    const getMailIcon = (item: MailItem) => {
        const tag = (item.tag || '').toLowerCase();
        const sender = (item.sender_name || '').toLowerCase();
        const subject = (item.subject || '').toLowerCase();
        const combined = `${tag} ${sender} ${subject}`;

        if (combined.includes('bank') || combined.includes('barclays') || combined.includes('hsbc') || combined.includes('lloyds')) {
            return Landmark;
        }
        if (combined.includes('hmrc') || combined.includes('companies house') || combined.includes('gov')) {
            return Building2;
        }
        return FileText;
    };

    // Handle archive mail item
    const handleArchive = useCallback(async (item: MailItem, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent opening mail detail

        // Optimistic update: Update cache immediately for instant UI feedback
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.id === item.id
                        ? { ...mailItem, deleted: true }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                toast({
                    title: "Mail Archived",
                    description: "Mail item has been moved to archive",
                    durationMs: 2000,
                });
                mutateMailItems(); // Single revalidation after success
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                throw new Error('Failed to archive mail');
            }
        } catch (error) {
            console.error('Error archiving mail:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Archive Failed",
                description: "Failed to archive mail. Please try again.",
                variant: "destructive",
                durationMs: 3000,
            });
        }
    }, [toast, mailData, mutateMailItems]);

    const handleUnarchive = useCallback(async (item: MailItem, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent opening mail detail

        // Optimistic update: Update cache immediately for instant UI feedback
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.id === item.id
                        ? { ...mailItem, deleted: false }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                toast({
                    title: "Mail Restored",
                    description: "Mail item has been moved back to inbox",
                    durationMs: 2000,
                });
                mutateMailItems(); // Single revalidation after success
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                throw new Error('Failed to restore mail');
            }
        } catch (error) {
            console.error('Error restoring mail:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Restore Failed",
                description: "Failed to restore mail. Please try again.",
                variant: "destructive",
                durationMs: 3000,
            });
        }
    }, [toast, mailData, mutateMailItems]);


    // Handle mail item click - open in-place (replace list view)
    const handleMailClick = useCallback((item: MailItem) => {
        // Save scroll position before opening detail
        setScrollPosition(window.scrollY);
        setSelectedMailDetail(item);
        setSelectedMailForPDF(item);
        setShowPDFModal(false);
        // Scroll to top when opening detail
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Handle back button - return to inbox list
    const handleBack = useCallback(() => {
        setSelectedMailDetail(null);
        // Restore scroll position after a brief delay to ensure DOM update
        setTimeout(() => {
            window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
        }, 100);
    }, [scrollPosition]);

    // Mark mail as read
    const markAsRead = useCallback(async (item: MailItem) => {
        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ is_read: true }),
            });
            if (response.ok) {
                // Refresh mail list
                // The SWR will automatically refetch
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }, []);

    // View handler - open PDF modal
    const handleView = useCallback(() => {
        if (selectedMailDetail) {
            setSelectedMailForPDF(selectedMailDetail);
            setShowPDFModal(true);
        }
    }, [selectedMailDetail]);


    // Forward handler - open forwarding modal
    const handleForward = useCallback(() => {
        console.log('[MailDetail] handleForward called', { selectedMailDetail: selectedMailDetail?.id });
        if (!selectedMailDetail) {
            console.warn('[MailDetail] No selected mail detail, cannot forward');
            toast({
                title: 'No Mail Selected',
                description: 'Please select a mail item to forward.',
                variant: 'destructive',
            });
            return;
        }

        // Check if GDPR expired (older than 30 days)
        const receivedDate = selectedMailDetail.received_date || selectedMailDetail.created_at;
        if (receivedDate) {
            const received = new Date(receivedDate);
            const now = new Date();
            const daysDiff = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 30) {
                console.log('[MailDetail] Mail is GDPR expired, cannot forward');
                setForwardInlineNotice('This mail item is older than 30 days and cannot be forwarded due to GDPR compliance.');
                return;
            }
        }

        // Open forwarding modal
        console.log('[MailDetail] Opening forwarding modal for mail:', selectedMailDetail.id);
        setSelectedMailForForwarding(selectedMailDetail);
        setShowForwardingModal(true);
        setForwardInlineNotice(null);
    }, [selectedMailDetail, toast]);

    // Handle forwarding form submission
    const handleForwardingSubmit = useCallback(async (data: any) => {
        if (!selectedMailForForwarding) return;

        try {
            const response = await fetch('/api/bff/forwarding/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    mail_item_id: selectedMailForForwarding.id,
                    ...data
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.ok) {
                    toast({
                        title: "Forwarding Request Created",
                        description: "Your request will be reviewed by our team.",
                        durationMs: 5000,
                    });
                    setShowForwardingModal(false);
                    setSelectedMailForForwarding(null);
                    // Refresh mail list
                    // SWR will automatically refetch
                } else {
                    toast({
                        title: "Forwarding Request Failed",
                        description: result.error || 'Unknown error',
                        variant: "destructive",
                        durationMs: 5000,
                    });
                }
            } else {
                const errorData = await response.json().catch(() => ({}));

                // Handle incomplete forwarding address error
                if (errorData.error === 'forwarding_address_incomplete' && errorData.fields) {
                    const missingFields = errorData.fields || [];
                    const fieldLabels: Record<string, string> = {
                        'name': 'Full Name',
                        'address_line_1': 'Address Line 1',
                        'city': 'City',
                        'postal_code': 'Postcode',
                    };
                    const missingLabels = missingFields.map((f: string) => fieldLabels[f] || f).join(', ');

                    toast({
                        title: "Incomplete Forwarding Address",
                        description: `Please add your ${missingLabels} before requesting forwarding. You can update your forwarding address in Account settings.`,
                        variant: "destructive",
                        durationMs: 6000,
                    });
                } else {
                    toast({
                        title: "Request Failed",
                        description: errorData.message || errorData.error || "Failed to create forwarding request. Please try again.",
                        variant: "destructive",
                        durationMs: 5000,
                    });
                }
            }
        } catch (error) {
            console.error('Error creating forwarding request:', error);
            toast({
                title: "Request Error",
                description: "Error creating forwarding request. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedMailForForwarding, toast]);

    // Auto-mark as read when opened
    useEffect(() => {
        if (selectedMailDetail && !selectedMailDetail.is_read) {
            markAsRead(selectedMailDetail);
        }
    }, [selectedMailDetail, markAsRead]);

    // Format time helper
    const formatTime = useCallback((d?: string | number) => {
        if (!d) return "—";
        const date = typeof d === "number" ? new Date(d) : new Date(d);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    }, []);

    // Mail type icon helper
    const mailTypeIcon = useCallback((item: MailItem) => {
        return getMailIcon(item);
    }, []);

    // Mail status meta helper
    const mailStatusMeta = useCallback((item: MailItem) => {
        const raw = (item.status || "").toLowerCase();
        const isForwarded = raw.includes("forward");
        const isScanned = Boolean(item.scanned_at || item.file_url) || raw.includes("scan");
        const isNew = !item.is_read && !isForwarded;

        if (isForwarded) {
            return { label: "Forwarded", badgeClass: "bg-primary text-white border-transparent" };
        }
        if (isScanned) {
            return { label: "Scanned", badgeClass: "bg-muted text-foreground border-transparent" };
        }
        if (isNew) {
            return { label: "New", badgeClass: "bg-blue-600 text-white border-transparent" };
        }
        return { label: "Received", badgeClass: "bg-muted text-foreground border-transparent" };
    }, []);

    // Load PDF preview for selected mail
    useEffect(() => {
        let cancelled = false;
        const ctrl = new AbortController();

        const revoke = (url: string | null) => {
            try {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            } catch { }
        };

        async function loadMini() {
            setMiniViewerError(null);
            setMiniViewerLoading(false);

            if (!selectedMailDetail?.id) {
                revoke(miniViewerUrl);
                setMiniViewerUrl(null);
                return;
            }

            setMiniViewerLoading(true);
            revoke(miniViewerUrl);
            setMiniViewerUrl(null);

            try {
                const mailItemId = selectedMailDetail.id;
                const url = `/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(String(mailItemId))}&disposition=inline`;
                const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;

                const res = await fetch(url, {
                    credentials: 'include',
                    cache: 'no-store',
                    signal: ctrl.signal,
                    headers: {
                        Accept: 'application/pdf',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });

                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(txt || `Failed to load preview (${res.status})`);
                }

                const ab = await res.arrayBuffer();
                const { isCheckpointOrHtmlResponse, SCAN_CHECKPOINT_MESSAGE: checkpointMsg } = await import('@/lib/scanUrlUtils');
                if (isCheckpointOrHtmlResponse(res.headers.get('Content-Type'), ab)) {
                    throw new Error(checkpointMsg);
                }
                const blob = new Blob([ab], { type: 'application/pdf' });
                const bUrl = URL.createObjectURL(blob);
                if (!cancelled) setMiniViewerUrl(bUrl);
            } catch (e: any) {
                if (!cancelled) setMiniViewerError(e?.message || 'Preview unavailable');
            } finally {
                if (!cancelled) setMiniViewerLoading(false);
            }
        }

        loadMini();
        return () => {
            cancelled = true;
            ctrl.abort();
            revoke(miniViewerUrl);
        };
    }, [selectedMailDetail?.id]);

    // Auto-hide forwarding notice
    useEffect(() => {
        if (!forwardInlineNotice) return;
        const t = window.setTimeout(() => setForwardInlineNotice(null), 8000);
        return () => window.clearTimeout(t);
    }, [forwardInlineNotice]);

    return (
        <div className="w-full min-w-0">
            {/* List chrome only — hide while reading a message so search/tabs don’t compete with the PDF */}
            {!selectedMailDetail && (
                <>
                    {/* Page title + count: compact single row on mobile */}
                    <div className="flex flex-col sm:block mb-3 md:mb-6">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h1 className="text-h4 sm:text-h2 md:text-h1 text-foreground tracking-tight">
                                Mail
                            </h1>
                            <span className="text-caption text-muted-foreground tabular-nums">{inboxCount} items</span>
                        </div>
                    </div>

                    {/* Search: compact bar on mobile, full width */}
                    <div className="relative w-full mb-3 md:mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none shrink-0" strokeWidth={2} />
                        <Input
                            type="text"
                            placeholder="Search mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 md:h-10 rounded-lg border-border bg-card text-body-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary border transition-colors md:w-80"
                        />
                    </div>

                    {selectedTagFilter && activeTab === 'inbox' && (
                        <div className="mb-3 flex items-center gap-2 py-2 px-3 rounded-lg bg-muted border border-border/80">
                            <span className="text-caption text-muted-foreground">Filtered by:</span>
                            <TagDot
                                tag={selectedTagFilter === 'untagged' ? null : selectedTagFilter}
                                label={selectedTagFilter === 'untagged' ? 'Untagged' : getTagLabel(selectedTagFilter)}
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearTagFilter}
                                className="h-7 px-2 text-caption text-muted-foreground hover:text-foreground hover:bg-muted/60 ml-auto rounded-md"
                            >
                                <X className="h-3 w-3 mr-1 shrink-0" strokeWidth={2} />
                                Clear
                            </Button>
                        </div>
                    )}

                    {/* Tabs — compact segmented control on mobile */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => {
                            setActiveTab(v as 'inbox' | 'archived' | 'tags');
                            if (v !== 'inbox') setSelectedTagFilter(null);
                        }}
                        className="mb-3 md:mb-6"
                    >
                        <div className="sticky top-[3rem] md:top-0 z-20 bg-background md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 border-b-0 md:border-b md:border-border">
                            <TabsList className={cn(
                                "inline-flex w-full md:w-auto h-8 md:h-auto p-0.5 rounded-lg md:rounded-none bg-muted/60 md:bg-transparent border-0 gap-0",
                                "md:border-b md:border-border"
                            )}>
                                <TabsTrigger
                                    value="inbox"
                                    className={cn(
                                        "flex-1 min-w-0 md:flex-none h-7 md:h-auto px-2 sm:px-3 md:px-5 py-1.5 md:py-3 text-caption md:text-body-sm font-medium rounded-md md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-0",
                                        "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                        "text-muted-foreground hover:text-foreground md:hover:text-foreground",
                                        "transition-colors touch-manipulation"
                                    )}
                                >
                                    <span className="md:hidden">Inbox</span>
                                    <span className="hidden md:inline">Inbox · {inboxCount}</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="archived"
                                    className={cn(
                                        "flex-1 min-w-0 md:flex-none h-7 md:h-auto px-2 sm:px-3 md:px-5 py-1.5 md:py-3 text-caption md:text-body-sm font-medium rounded-md md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-0",
                                        "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                        "text-muted-foreground hover:text-foreground md:hover:text-foreground",
                                        "transition-colors touch-manipulation"
                                    )}
                                >
                                    <span className="md:hidden">Archived</span>
                                    <span className="hidden md:inline">Archived · {archivedCount}</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="tags"
                                    className={cn(
                                        "flex-1 min-w-0 md:flex-none h-7 md:h-auto px-2 sm:px-3 md:px-5 py-1.5 md:py-3 text-caption md:text-body-sm font-medium rounded-md md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-0",
                                        "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                        "text-muted-foreground hover:text-foreground md:hover:text-foreground",
                                        "transition-colors touch-manipulation"
                                    )}
                                >
                                    <span className="md:hidden">Tags</span>
                                    <span className="hidden md:inline">Tags · {tagsCount}</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </Tabs>
                </>
            )}

            {/* In-place replacement: Show list OR detail, not both */}
            {selectedMailDetail ? (
                /* Mail Detail View - Full-screen on mobile, in-place on desktop */
                <div className="w-full md:relative fixed inset-0 md:inset-auto bg-card md:bg-transparent z-50 md:z-auto overflow-y-auto md:overflow-visible md:static">
                    <div className="min-w-0 max-w-full px-4 py-3 pb-8 md:max-w-none md:p-0 md:pb-0">
                        <MailDetail
                            item={selectedMailDetail}
                            onBack={handleBack}
                            onView={handleView}
                            onForward={handleForward}
                            onArchive={selectedMailDetail.deleted ? undefined : async () => {
                                const fakeEvent = { stopPropagation: () => { } } as React.MouseEvent;
                                await handleArchive(selectedMailDetail, fakeEvent);
                                // Navigate back to list after archiving
                                handleBack();
                            }}
                            onUnarchive={selectedMailDetail.deleted ? async () => {
                                const fakeEvent = { stopPropagation: () => { } } as React.MouseEvent;
                                await handleUnarchive(selectedMailDetail, fakeEvent);
                                // Navigate back to list after unarchiving
                                handleBack();
                            } : undefined}
                            forwardInlineNotice={forwardInlineNotice}
                            onDismissForwardNotice={() => setForwardInlineNotice(null)}
                            miniViewerLoading={miniViewerLoading}
                            miniViewerUrl={miniViewerUrl}
                            miniViewerError={miniViewerError}
                            mailTypeIcon={mailTypeIcon}
                            mailStatusMeta={mailStatusMeta}
                            formatTime={formatTime}
                        />
                    </div>
                </div>
            ) : (
                /* Mail List View — tighter spacing on mobile */
                <div className="w-full space-y-1.5 md:space-y-2">
                    {mailLoading ? (
                        <div className="py-12 md:py-16 text-center">
                            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-3" />
                            <p className="text-body-sm text-muted-foreground">Loading mail...</p>
                        </div>
                    ) : mailError ? (
                        <div className="py-12 md:py-16 text-center">
                            <Mail className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
                            <p className="text-body-sm font-medium text-foreground mb-0.5">Failed to load mail</p>
                            <p className="text-caption text-muted-foreground">Please refresh the page to try again</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-12 md:py-16 text-center">
                            <Mail className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
                            <p className="text-body-sm font-medium text-foreground mb-0.5">No mail items</p>
                            <p className="text-caption text-muted-foreground">Your mail will appear here when it arrives</p>
                        </div>
                    ) : activeTab === 'tags' && groupedByTag && groupedByTag.length > 0 ? (
                        <div className="space-y-6">
                            {groupedByTag.map(({ tag: groupTag, items, count }) => {
                                const isCollapsed = collapsedTags.has(groupTag);
                                const colorClass = getTagColor(groupTag);
                                return (
                                    <div key={groupTag} className="space-y-3">
                                        <div className="sticky top-[3rem] md:top-0 z-10 bg-card py-2 md:py-2 border-b border-border">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCollapseToggle(groupTag, e)}
                                                    className="flex-shrink-0 p-1.5 hover:bg-muted rounded-md transition-colors duration-150"
                                                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                                                >
                                                    {isCollapsed ? (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTagHeaderClick(groupTag)}
                                                    className="flex-1 flex items-center gap-2.5 hover:bg-muted/50 -mx-1 px-2 py-1.5 rounded-md transition-colors duration-150 text-left"
                                                >
                                                    <div className={cn('h-2 w-2 rounded-full flex-shrink-0', colorClass)} />
                                                    <div className="flex items-baseline gap-2">
                                                        <h2 className="text-body font-semibold text-foreground tracking-tight">
                                                            {groupTag === 'untagged' ? 'Untagged' : getTagLabel(groupTag)}
                                                        </h2>
                                                        <span className="text-body-sm text-muted-foreground">{count} items</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="space-y-1.5 md:space-y-2 pb-6">
                                                {items.map((item) => {
                                                    const Icon = getMailIcon(item);
                                                    const rowLabel = getMailItemPrimaryLabel(item);
                                                    const isRead = item.is_read ?? true;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => handleMailClick(item)}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    handleMailClick(item);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "flex flex-col md:flex-row md:items-center gap-2 md:gap-5 rounded-lg border px-3 py-2 md:px-6 md:py-4",
                                                                "bg-card hover:bg-muted/50 active:bg-muted/80 transition-colors",
                                                                "border-border hover:border-border md:hover:border-primary/30",
                                                                "cursor-pointer touch-manipulation md:shadow-sm md:hover:shadow min-w-0"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 w-full min-w-0 md:hidden">
                                                                <div
                                                                    className={cn(
                                                                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                                                                        isRead ? 'bg-muted' : 'bg-primary/10'
                                                                    )}
                                                                >
                                                                    <Icon
                                                                        className={cn(
                                                                            'h-4 w-4 shrink-0',
                                                                            isRead ? 'text-muted-foreground' : 'text-primary'
                                                                        )}
                                                                        strokeWidth={2}
                                                                    />
                                                                </div>
                                                                <p
                                                                    className={cn(
                                                                        'flex-1 min-w-0 text-body-sm leading-tight truncate',
                                                                        isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
                                                                    )}
                                                                >
                                                                    {rowLabel}
                                                                </p>
                                                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                    <CreatableTagSelect
                                                                        compact
                                                                        value={item.tag ?? null}
                                                                        availableTags={availableTags}
                                                                        onValueChange={(newTag) => handleTagUpdate(item, newTag)}
                                                                        getTagLabel={getTagLabel}
                                                                        className="w-auto"
                                                                    />
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
                                                            </div>
                                                            <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
                                                                <div className="flex-shrink-0">
                                                                    <Icon
                                                                        className={cn(
                                                                            'h-5 w-5',
                                                                            isRead ? 'text-muted-foreground' : 'text-foreground'
                                                                        )}
                                                                        strokeWidth={2}
                                                                    />
                                                                </div>
                                                                <p
                                                                    className={cn(
                                                                        'flex-1 min-w-0 text-body-sm leading-tight truncate',
                                                                        isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
                                                                    )}
                                                                >
                                                                    {rowLabel}
                                                                </p>
                                                            </div>
                                                            <div className="hidden md:flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                <CreatableTagSelect
                                                                    value={item.tag ?? null}
                                                                    availableTags={availableTags}
                                                                    onValueChange={(newTag) => handleTagUpdate(item, newTag)}
                                                                    getTagLabel={getTagLabel}
                                                                />
                                                                {item.deleted ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => handleUnarchive(item, e)}
                                                                        className="h-9 px-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                    >
                                                                        <ArchiveRestore className="h-4 w-4 mr-1.5" />
                                                                        Unarchive
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => handleArchive(item, e)}
                                                                        className="h-9 px-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                    >
                                                                        <Archive className="h-4 w-4 mr-1.5" />
                                                                        Archive
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const Icon = getMailIcon(item);
                            const rowLabel = getMailItemPrimaryLabel(item);
                            const isRead = item.is_read ?? true;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleMailClick(item)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMailClick(item); } }}
                                    className={cn(
                                        "flex flex-col md:flex-row md:items-center gap-2 md:gap-5 rounded-lg border px-3 py-2 md:px-6 md:py-4",
                                        "bg-card hover:bg-muted/50 active:bg-muted/80 transition-colors",
                                        "border-border hover:border-border md:hover:border-primary/30",
                                        "cursor-pointer touch-manipulation md:shadow-sm md:hover:shadow min-w-0"
                                    )}
                                >
                                    <div className="flex items-center gap-2 w-full min-w-0 md:hidden">
                                        <div className={cn(
                                            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                            isRead ? "bg-muted" : "bg-primary/10"
                                        )}>
                                            <Icon className={cn(
                                                "h-4 w-4 shrink-0",
                                                isRead ? 'text-muted-foreground' : 'text-primary'
                                            )} strokeWidth={2} />
                                        </div>
                                        <p className={cn(
                                            "flex-1 min-w-0 text-body-sm leading-tight truncate",
                                            isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
                                        )}>
                                            {rowLabel}
                                        </p>
                                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <CreatableTagSelect
                                                compact
                                                value={item.tag ?? null}
                                                availableTags={availableTags}
                                                onValueChange={(newTag) => handleTagUpdate(item, newTag)}
                                                getTagLabel={getTagLabel}
                                                className="w-auto"
                                            />
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
                                    </div>

                                    <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            <Icon className={cn(
                                                "h-5 w-5",
                                                isRead ? 'text-muted-foreground' : 'text-foreground'
                                            )} strokeWidth={2} />
                                        </div>
                                        <p className={cn(
                                            "flex-1 min-w-0 text-body-sm leading-tight truncate",
                                            isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'
                                        )}>
                                            {rowLabel}
                                        </p>
                                    </div>

                                    <div className="hidden md:flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <CreatableTagSelect
                                            value={item.tag ?? null}
                                            availableTags={availableTags}
                                            onValueChange={(newTag) => handleTagUpdate(item, newTag)}
                                            getTagLabel={getTagLabel}
                                        />
                                        {item.deleted ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleUnarchive(item, e)}
                                                className="h-8 px-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                                            >
                                                <ArchiveRestore className="h-4 w-4 mr-1.5" strokeWidth={2} />
                                                Unarchive
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleArchive(item, e)}
                                                className="h-8 px-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                                            >
                                                <Archive className="h-4 w-4 mr-1.5" strokeWidth={2} />
                                                Archive
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {showPDFModal && selectedMailForPDF && (
                <PDFViewerModal
                    isOpen={showPDFModal}
                    onClose={() => {
                        setShowPDFModal(false);
                        setSelectedMailForPDF(null);
                    }}
                    mailItemId={selectedMailForPDF.id ? Number(selectedMailForPDF.id) : null}
                    mailItemSubject={getMailItemPrimaryLabel(selectedMailForPDF)}
                />
            )}

            {/* Forwarding Request Modal */}
            {showForwardingModal && selectedMailForForwarding && (
                <ForwardingRequestModal
                    isOpen={showForwardingModal}
                    onClose={() => {
                        setShowForwardingModal(false);
                        setSelectedMailForForwarding(null);
                    }}
                    mailItem={selectedMailForForwarding}
                    forwardingAddress={profile?.forwarding_address}
                    onSubmit={handleForwardingSubmit}
                />
            )}
        </div>
    );
}
