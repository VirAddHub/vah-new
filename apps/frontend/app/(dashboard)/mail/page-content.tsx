'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Building2, FileText, Landmark, Settings, Search, ChevronDown, ChevronRight, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { MailDetail } from '@/components/dashboard/user/MailDetail';
import PDFViewerModal from '@/components/PDFViewerModal';
import { ForwardingRequestModal } from '@/components/ForwardingRequestModal';
import { useToast } from '@/components/ui/use-toast';
import { TagDot, getTagColor } from '@/components/dashboard/user/TagDot';
import type { MailItem } from '@/components/dashboard/user/types';

export default function MailInboxPage() {
    const router = useRouter();
    const { setActiveView } = useDashboardView();
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null); // Filter inbox by tag
    const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set()); // Collapsed tag groups
    const [showManageTagsModal, setShowManageTagsModal] = useState(false);
    const [manageTagAction, setManageTagAction] = useState<'rename' | 'merge' | null>(null);
    const [selectedTagForManage, setSelectedTagForManage] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [mergeTargetTag, setMergeTargetTag] = useState<string | null>(null);

    // Set the active view when this component mounts
    useEffect(() => {
        setActiveView('mail');
    }, [setActiveView]);
    
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

    // Fetch mail items
    const { data: mailData, error: mailError, isLoading: mailLoading } = useSWR(
        '/api/bff/mail-items?includeArchived=true',
        swrFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    );

    const mailItems = useMemo(() => {
        if (!mailData?.ok) return [];
        return Array.isArray(mailData.items) ? mailData.items : [];
    }, [mailData]);

    // Filter mail items based on active tab
    const filteredItems = useMemo(() => {
        let items: MailItem[] = mailItems;

        // Filter by tab
        if (activeTab === 'archived') {
            items = items.filter((item: MailItem) => item.deleted);
        } else if (activeTab === 'inbox') {
            items = items.filter((item: MailItem) => !item.deleted);
            // Apply tag filter if selected
            if (selectedTagFilter) {
                items = items.filter((item: MailItem) => item.tag === selectedTagFilter);
            }
        } else if (activeTab === 'tags') {
            // Show all non-deleted items (tagged and untagged) in Tags tab
            items = items.filter((item: MailItem) => !item.deleted);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter((item: MailItem) =>
                item.subject?.toLowerCase().includes(query) ||
                item.sender_name?.toLowerCase().includes(query) ||
                item.tag?.toLowerCase().includes(query) ||
                item.received_date?.toLowerCase().includes(query)
            );
        }

        return items;
    }, [mailItems, activeTab, searchQuery, selectedTagFilter]);

    // Tag mapping: slug -> display label
    const tagMeta: Record<string, { label: string }> = {
        hmrc: { label: "HMRC" },
        companies_house: { label: "Companies House" },
        bank: { label: "BANK" },
        insurance: { label: "Insurance" },
        utilities: { label: "Utilities" },
        other: { label: "Other" },
    };

    // Get tag display label
    const getTagLabel = useCallback((tag: string | null | undefined): string => {
        if (!tag || tag === 'untagged') return "Untagged";
        return tagMeta[tag]?.label || tag.toUpperCase().replace(/_/g, ' ');
    }, []);

    // Handle tag header click - filter inbox
    const handleTagHeaderClick = useCallback((tag: string) => {
        // Filter inbox by tag
        setSelectedTagFilter(tag);
        setActiveTab('inbox');
    }, []);

    // Clear tag filter
    const clearTagFilter = useCallback(() => {
        setSelectedTagFilter(null);
    }, []);

    // Toggle tag group collapse
    const toggleTagCollapse = useCallback((tag: string) => {
        setCollapsedTags(prev => {
            const next = new Set(prev);
            if (next.has(tag)) {
                next.delete(tag);
            } else {
                next.add(tag);
            }
            return next;
        });
    }, []);

    // Handle collapse toggle - separate from header click
    const handleCollapseToggle = useCallback((tag: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering header click
        toggleTagCollapse(tag);
    }, [toggleTagCollapse]);

    // Handle tag rename
    const handleTagRename = useCallback(async () => {
        if (!selectedTagForManage || !newTagName.trim()) return;

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
            const oldTag = selectedTagForManage;
            const newTag = newTagName.trim().toLowerCase().replace(/\s+/g, '_');

            // Get all items with this tag
            const itemsToUpdate = mailItems.filter((item: MailItem) => item.tag === oldTag && !item.deleted);
            
            // Update each item
            const updatePromises = itemsToUpdate.map((item: MailItem) =>
                fetch(`/api/bff/mail-items/${item.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify({ tag: newTag }),
                })
            );

            await Promise.all(updatePromises);
            
            toast({
                title: "Tag Renamed",
                description: `Tag "${oldTag}" has been renamed to "${newTag}".`,
                durationMs: 3000,
            });

            setShowManageTagsModal(false);
            setSelectedTagForManage(null);
            setNewTagName('');
            // SWR will auto-refetch
        } catch (error) {
            console.error('Error renaming tag:', error);
            toast({
                title: "Rename Failed",
                description: "Failed to rename tag. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedTagForManage, newTagName, mailItems, toast]);

    // Handle tag merge
    const handleTagMerge = useCallback(async () => {
        if (!selectedTagForManage || !mergeTargetTag) return;

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
            const sourceTag = selectedTagForManage;
            const targetTag = mergeTargetTag;

            // Get all items with source tag
            const itemsToUpdate = mailItems.filter((item: MailItem) => item.tag === sourceTag && !item.deleted);
            
            // Update each item to target tag
            const updatePromises = itemsToUpdate.map((item: MailItem) =>
                fetch(`/api/bff/mail-items/${item.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify({ tag: targetTag }),
                })
            );

            await Promise.all(updatePromises);
            
            toast({
                title: "Tags Merged",
                description: `Tag "${sourceTag}" has been merged into "${targetTag}".`,
                durationMs: 3000,
            });

            setShowManageTagsModal(false);
            setSelectedTagForManage(null);
            setMergeTargetTag(null);
            // SWR will auto-refetch
        } catch (error) {
            console.error('Error merging tags:', error);
            toast({
                title: "Merge Failed",
                description: "Failed to merge tags. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedTagForManage, mergeTargetTag, mailItems, toast]);

    // Get unique tags
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        mailItems.forEach((item: MailItem) => {
            if (item.tag && !item.deleted) {
                tags.add(item.tag);
            }
        });
        return Array.from(tags).sort();
    }, [mailItems]);

    // Group items by tag for Tags tab
    const groupedByTag = useMemo(() => {
        if (activeTab !== 'tags') return null;
        
        const groups: Record<string, MailItem[]> = {};
        filteredItems.forEach((item: MailItem) => {
            const tag = item.tag || 'untagged';
            if (!groups[tag]) {
                groups[tag] = [];
            }
            groups[tag].push(item);
        });
        
        // Sort tags: tagged items first (alphabetically), then untagged
        const sortedTags = Object.keys(groups).sort((a, b) => {
            if (a === 'untagged') return 1;
            if (b === 'untagged') return -1;
            return a.localeCompare(b);
        });
        
        return sortedTags.map(tag => ({
            tag,
            items: groups[tag],
            count: groups[tag].length
        }));
    }, [filteredItems, activeTab]);

    // Counts
    const inboxCount = mailItems.filter((item: MailItem) => !item.deleted).length;
    const archivedCount = mailItems.filter((item: MailItem) => item.deleted).length;
    const tagsCount = availableTags.length;

    // Format date
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return '';
        }
    };

    // Get mail type icon
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

    // Get sender name
    const getSenderName = (item: MailItem) => {
        return item.sender_name || item.subject || 'Unknown Sender';
    };

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
            const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    // Download handler
    const [isDownloading, setIsDownloading] = useState(false);
    const handleDownload = useCallback(async () => {
        console.log('[MailDetail] handleDownload called', { selectedMailDetail: selectedMailDetail?.id, isDownloading });
        if (!selectedMailDetail) {
            console.warn('[MailDetail] No selected mail detail, cannot download');
            toast({
                title: 'No Mail Selected',
                description: 'Please select a mail item to download.',
                variant: 'destructive',
            });
            return;
        }
        
        if (isDownloading) {
            console.log('[MailDetail] Download already in progress');
            return;
        }
        
        setIsDownloading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
            const downloadUrl = `/api/bff/mail-items/${selectedMailDetail.id}/download?disposition=attachment`;
            console.log('[MailDetail] Fetching download URL:', downloadUrl);
            
            const response = await fetch(downloadUrl, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            
            console.log('[MailDetail] Download response status:', response.status, response.ok);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Download failed: ${response.status} ${errorText}`);
            }
            
            const blob = await response.blob();
            console.log('[MailDetail] Blob received, size:', blob.size);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mail-${selectedMailDetail.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast({
                title: 'Download Started',
                description: 'Your file download has started.',
                durationMs: 2000,
            });
        } catch (error) {
            console.error('[MailDetail] Download error:', error);
            toast({
                title: 'Download Failed',
                description: error instanceof Error ? error.message : 'Unable to download file. Please try again.',
                variant: 'destructive',
                durationMs: 5000,
            });
        } finally {
            setIsDownloading(false);
        }
    }, [selectedMailDetail, isDownloading, toast]);

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
                setForwardInlineNotice('This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it.');
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
            return { label: "Forwarded", badgeClass: "bg-emerald-600 text-white border-transparent" };
        }
        if (isScanned) {
            return { label: "Scanned", badgeClass: "bg-neutral-200 text-neutral-700 border-transparent" };
        }
        if (isNew) {
            return { label: "New", badgeClass: "bg-blue-600 text-white border-transparent" };
        }
        return { label: "Received", badgeClass: "bg-neutral-200 text-neutral-700 border-transparent" };
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
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                
                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(txt || `Failed to load preview (${res.status})`);
                }

                const ab = await res.arrayBuffer();
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
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Header - Title + Count inline, Actions grouped on right */}
            <div className="flex items-center justify-between mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-[#1A1A1A]">Mail Inbox</h1>
                    <span className="text-sm text-[#666666]">({inboxCount})</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666666]" />
                        <Input
                            type="text"
                            placeholder="Search mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 rounded-md bg-[#F9F9F9] border-0 text-sm focus-visible:ring-1 focus-visible:ring-[#40C46C]"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-md hover:bg-[#F9F9F9]"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Tag Filter Indicator */}
            {selectedTagFilter && activeTab === 'inbox' && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                        Filtered by:
                    </span>
                    <TagDot tag={selectedTagFilter} label={getTagLabel(selectedTagFilter)} />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearTagFilter}
                        className="h-7 px-2 text-xs text-[#666666] hover:text-[#1A1A1A]"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        <X className="h-3 w-3 mr-1" />
                        Clear filter
                    </Button>
                </div>
            )}

            {/* Horizontal Tabs - Replaces the sidebar */}
            <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as 'inbox' | 'archived' | 'tags');
                // Clear tag filter when switching tabs
                if (v !== 'inbox') {
                    setSelectedTagFilter(null);
                }
            }} className="mb-6">
                <TabsList className="bg-transparent border-b border-[#E5E7EB] rounded-none p-0 h-auto">
                    <TabsTrigger
                        value="inbox"
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#40C46C] data-[state=active]:text-[#024E40] data-[state=active]:bg-transparent",
                            "text-[#666666] hover:text-[#1A1A1A]"
                        )}
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Inbox ({inboxCount})
                    </TabsTrigger>
                    <TabsTrigger
                        value="archived"
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#40C46C] data-[state=active]:text-[#024E40] data-[state=active]:bg-transparent",
                            "text-[#666666] hover:text-[#1A1A1A]"
                        )}
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Archived ({archivedCount})
                    </TabsTrigger>
                    <TabsTrigger
                        value="tags"
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#40C46C] data-[state=active]:text-[#024E40] data-[state=active]:bg-transparent",
                            "text-[#666666] hover:text-[#1A1A1A]"
                        )}
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Tags ({tagsCount})
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* In-place replacement: Show list OR detail, not both */}
            {selectedMailDetail ? (
                /* Mail Detail View - replaces the list */
                <div className="w-full">
                    <MailDetail
                        item={selectedMailDetail}
                        onBack={handleBack}
                        onView={handleView}
                        onDownload={handleDownload}
                        onForward={handleForward}
                        forwardInlineNotice={forwardInlineNotice}
                        onDismissForwardNotice={() => setForwardInlineNotice(null)}
                        miniViewerLoading={miniViewerLoading}
                        miniViewerUrl={miniViewerUrl}
                        miniViewerError={miniViewerError}
                        isDownloading={isDownloading}
                        mailTypeIcon={mailTypeIcon}
                        mailStatusMeta={mailStatusMeta}
                        formatTime={formatTime}
                    />
                </div>
            ) : (
                /* Mail List View */
                <div className="w-full space-y-3">
                    {mailLoading ? (
                        <div className="py-12 text-center text-sm text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Loading mail...
                        </div>
                    ) : mailError ? (
                        <div className="py-12 text-center text-sm text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Failed to load mail. Please try again.
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            No mail items found.
                        </div>
                    ) : activeTab === 'tags' && groupedByTag && groupedByTag.length > 0 ? (
                        /* Grouped Tags View */
                        <div className="space-y-8">
                            {/* Manage Tags Button */}
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowManageTagsModal(true);
                                        setManageTagAction(null);
                                    }}
                                    className="h-9 px-3 rounded-md"
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    <Tag className="h-4 w-4 mr-2" />
                                    Manage Tags
                                </Button>
                            </div>
                            {groupedByTag.map(({ tag, items, count }) => {
                                const isCollapsed = collapsedTags.has(tag);
                                const colorClass = getTagColor(tag);
                                
                                return (
                                <div key={tag} className="space-y-4">
                                    {/* Tag Header - Clickable to filter inbox, collapsible */}
                                    <div className="sticky top-0 z-10 bg-white pb-2 border-b border-[#E5E7EB]">
                                        <div className="flex items-center gap-2 -mx-2 px-2 py-1">
                                            <button
                                                onClick={(e) => handleCollapseToggle(tag, e)}
                                                className="flex-shrink-0 p-1 hover:bg-[#F9F9F9] rounded transition-colors"
                                                aria-label={isCollapsed ? "Expand" : "Collapse"}
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="h-4 w-4 text-[#666666]" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-[#666666]" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleTagHeaderClick(tag)}
                                                className="flex-1 flex items-center gap-2 hover:bg-[#F9F9F9] -mx-1 px-1 py-1 rounded transition-colors group text-left"
                                            >
                                                <div className={cn('h-2 w-2 rounded-full flex-shrink-0', colorClass)} />
                                                <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                    {getTagLabel(tag)}
                                                    <span className="text-sm font-normal text-[#666666]">({count})</span>
                                                </h2>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Mail Items for this Tag - Collapsible */}
                                    {!isCollapsed && (
                                        <div className="space-y-3">
                                            {items.map((item) => {
                                            const Icon = getMailIcon(item);
                                            const senderName = getSenderName(item);
                                            const date = formatDate(item.received_date || item.created_at);
                                            const isRead = item.is_read ?? true;
                                            
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleMailClick(item)}
                                                    className={cn(
                                                        "flex items-center justify-between rounded-lg border px-6 py-4",
                                                        "bg-white hover:bg-[#F9F9F9] cursor-pointer transition-all",
                                                        "border-[#E5E7EB] hover:border-[#40C46C]/30 hover:shadow-sm"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                                        <div className="flex-shrink-0">
                                                            <Icon className={cn(
                                                                "h-6 w-6",
                                                                isRead ? 'text-[#666666]' : 'text-[#024E40]'
                                                            )} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn(
                                                                "text-base leading-6 truncate",
                                                                isRead ? 'font-normal text-[#666666]' : 'font-medium text-[#1A1A1A]'
                                                            )} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                {senderName}
                                                            </p>
                                                            {item.subject && item.subject !== senderName && (
                                                                <p className="text-sm text-[#666666] mt-1 truncate" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                    {item.subject}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                        {item.tag && (
                                                            <TagDot tag={item.tag} label={getTagLabel(item.tag)} />
                                                        )}
                                                        <span className="text-sm text-[#666666] whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                            {date}
                                                        </span>
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
                        /* Flat List View (Inbox/Archived) */
                        filteredItems.map((item) => {
                            const Icon = getMailIcon(item);
                            const senderName = getSenderName(item);
                            const date = formatDate(item.received_date || item.created_at);
                            const isRead = item.is_read ?? true;
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleMailClick(item)}
                                    className={cn(
                                        "flex items-center justify-between rounded-lg border px-6 py-4",
                                        "bg-white hover:bg-[#F9F9F9] cursor-pointer transition-all",
                                        "border-[#E5E7EB] hover:border-[#40C46C]/30 hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            <Icon className={cn(
                                                "h-6 w-6",
                                                isRead ? 'text-[#666666]' : 'text-[#024E40]'
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-base leading-6 truncate",
                                                isRead ? 'font-normal text-[#666666]' : 'font-medium text-[#1A1A1A]'
                                            )} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                {senderName}
                                            </p>
                                            {item.subject && item.subject !== senderName && (
                                                <p className="text-sm text-[#666666] mt-1 truncate" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                    {item.subject}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                        {item.tag && (
                                            <TagDot tag={item.tag} label={getTagLabel(item.tag)} />
                                        )}
                                        <span className="text-sm text-[#666666] whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                            {date}
                                        </span>
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
                    mailItemSubject={selectedMailForPDF.subject || 'Mail Preview'}
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
                    onSubmit={handleForwardingSubmit}
                />
            )}

            {/* Manage Tags Modal */}
            <Dialog open={showManageTagsModal} onOpenChange={setShowManageTagsModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Manage Tags
                        </DialogTitle>
                    </DialogHeader>
                    
                    {!manageTagAction ? (
                        /* Action Selection */
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Select Tag
                                </Label>
                                <Select
                                    value={selectedTagForManage || ''}
                                    onValueChange={(value) => setSelectedTagForManage(value)}
                                >
                                    <SelectTrigger style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                        <SelectValue placeholder="Choose a tag to manage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTags.map(tag => (
                                            <SelectItem key={tag} value={tag}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('h-2 w-2 rounded-full', getTagColor(tag))} />
                                                    {getTagLabel(tag)}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedTagForManage && (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            setManageTagAction('rename');
                                            setNewTagName(selectedTagForManage);
                                        }}
                                        className="flex-1"
                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                    >
                                        Rename Tag
                                    </Button>
                                    <Button
                                        onClick={() => setManageTagAction('merge')}
                                        variant="outline"
                                        className="flex-1"
                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                    >
                                        Merge Tag
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : manageTagAction === 'rename' ? (
                        /* Rename Tag */
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    New Tag Name
                                </Label>
                                <Input
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Enter new tag name"
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setManageTagAction(null);
                                        setNewTagName('');
                                    }}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleTagRename}
                                    disabled={!newTagName.trim()}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Rename
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        /* Merge Tag */
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Merge into Tag
                                </Label>
                                <Select
                                    value={mergeTargetTag || ''}
                                    onValueChange={(value) => setMergeTargetTag(value)}
                                >
                                    <SelectTrigger style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                        <SelectValue placeholder="Choose target tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTags
                                            .filter(tag => tag !== selectedTagForManage)
                                            .map(tag => (
                                                <SelectItem key={tag} value={tag}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn('h-2 w-2 rounded-full', getTagColor(tag))} />
                                                        {getTagLabel(tag)}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    All items with "{getTagLabel(selectedTagForManage)}" will be moved to the selected tag.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setManageTagAction(null);
                                        setMergeTargetTag(null);
                                    }}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleTagMerge}
                                    disabled={!mergeTargetTag}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Merge
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
