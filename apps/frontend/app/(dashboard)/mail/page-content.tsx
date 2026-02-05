'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Building2, FileText, Landmark, Settings, Search, ChevronDown, ChevronRight, Tag, X, Archive, ArchiveRestore, Mail } from 'lucide-react';
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
import { CreatableTagSelect } from '@/components/dashboard/user/CreatableTagSelect';

export default function MailInboxPage() {
    const router = useRouter();
    const { isMobileSidebarOpen } = useDashboardView();
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null); // Filter inbox by tag
    const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set()); // Collapsed tag groups
    const [showManageTagsModal, setShowManageTagsModal] = useState(false);
    const [manageTagAction, setManageTagAction] = useState<'rename' | 'merge' | 'delete' | null>(null);
    const [selectedTagForManage, setSelectedTagForManage] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [mergeTargetTag, setMergeTargetTag] = useState<string | null>(null);

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
    const { data: mailData, error: mailError, isLoading: mailLoading, mutate: mutateMailItems } = useSWR(
        '/api/bff/mail-items?includeArchived=true',
        swrFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    );

    // Fetch tags (stable server-side list)
    const { data: tagsData, mutate: mutateTags } = useSWR('/api/bff/tags', swrFetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000,
    });

    // Fetch profile for forwarding address
    const { data: profileData } = useSWR('/api/bff/profile', swrFetcher);
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

    // Tag mapping: slug -> display label (predefined tags only)
    const tagMeta: Record<string, { label: string }> = {
        hmrc: { label: "HMRC" },
        companies_house: { label: "Companies House" },
        companieshouse: { label: "Companies House" },
        bank: { label: "Bank" },
        insurance: { label: "Insurance" },
        utilities: { label: "Utilities" },
        other: { label: "Other" },
    };

    /**
     * Humanize tag slug to display label
     * Converts: "my_custom_tag" → "My Custom Tag"
     */
    const humanizeTag = useCallback((slug: string): string => {
        return slug
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    // Get tag display label
    const getTagLabel = useCallback((tag: string | null | undefined): string => {
        if (!tag) return "Untagged";
        // Use predefined label if exists, otherwise humanize the slug
        return tagMeta[tag]?.label || humanizeTag(tag);
    }, [humanizeTag]);

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

    // Handle tag rename (atomic bulk operation)
    const handleTagRename = useCallback(async () => {
        if (!selectedTagForManage || !newTagName.trim()) return;

        const oldTag = selectedTagForManage;
        const newTag = newTagName.trim();

        // Optimistic update: Rename tags immediately in cache
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.tag === oldTag
                        ? { ...mailItem, tag: newTag }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            // Single atomic bulk rename
            const response = await fetch('/api/bff/tags/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ from: oldTag, to: newTag }),
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                toast({
                    title: "Tag Renamed",
                    description: `Tag "${oldTag}" has been renamed to "${data.to}". ${data.updated} item(s) updated.`,
                    durationMs: 3000,
                });

                setShowManageTagsModal(false);
                setSelectedTagForManage(null);
                setNewTagName('');

                // Single revalidation for both mail items and tags
                await Promise.all([mutateMailItems(), mutateTags()]);
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                throw new Error(data.error || 'Failed to rename tag');
            }
        } catch (error) {
            console.error('Error renaming tag:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Rename Failed",
                description: "Failed to rename tag. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedTagForManage, newTagName, toast, mailData, mutateMailItems, mutateTags]);

    // Handle tag merge (atomic bulk operation)
    const handleTagMerge = useCallback(async () => {
        if (!selectedTagForManage || !mergeTargetTag) return;

        const sourceTag = selectedTagForManage;
        const targetTag = mergeTargetTag;

        // Optimistic update: Merge tags immediately in cache
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.tag === sourceTag
                        ? { ...mailItem, tag: targetTag }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            // Single atomic bulk merge
            const response = await fetch('/api/bff/tags/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ source: sourceTag, target: targetTag }),
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                toast({
                    title: "Tags Merged",
                    description: `Tag "${sourceTag}" has been merged into "${data.target}". ${data.merged} item(s) updated.`,
                    durationMs: 3000,
                });

                setShowManageTagsModal(false);
                setSelectedTagForManage(null);
                setMergeTargetTag(null);

                // Single revalidation for both mail items and tags
                await Promise.all([mutateMailItems(), mutateTags()]);
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                throw new Error(data.error || 'Failed to merge tags');
            }
        } catch (error) {
            console.error('Error merging tags:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Merge Failed",
                description: "Failed to merge tags. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedTagForManage, mergeTargetTag, toast, mailData, mutateMailItems, mutateTags]);

    // Handle tag delete (removes tag from all active mail items)
    const handleTagDelete = useCallback(async () => {
        if (!selectedTagForManage) return;

        const tagToDelete = selectedTagForManage;

        // Optimistic update: Remove tags immediately in cache
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.tag === tagToDelete && !mailItem.deleted
                        ? { ...mailItem, tag: null }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            const csrfToken = typeof window !== 'undefined' ? localStorage.getItem('csrfToken') : null;

            const response = await fetch('/api/bff/tags/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
                body: JSON.stringify({ tag: tagToDelete }),
            });

            const data = await response.json();

            if (data.ok) {
                toast({
                    title: "Tag Deleted",
                    description: `Removed tag from ${data.updatedCount} active mail item(s). Archived mail is unaffected.`,
                    durationMs: 5000,
                });

                // Single revalidation for both mail items and tags
                await Promise.all([mutateMailItems(), mutateTags()]);

                // Reset modal state
                setSelectedTagForManage(null);
                setShowManageTagsModal(false);
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                toast({
                    title: "Delete Failed",
                    description: data.error || "Failed to delete tag. Please try again.",
                    variant: "destructive",
                    durationMs: 5000,
                });
            }
        } catch (error) {
            console.error('Error deleting tag:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Delete Failed",
                description: "Failed to delete tag. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        }
    }, [selectedTagForManage, toast, mailData, mutateMailItems, mutateTags]);

    // Get unique tags from stable server endpoint (not derived from mailItems)
    const availableTags = useMemo(() => {
        if (!tagsData?.ok) return [];
        return Array.isArray(tagsData.tags) ? tagsData.tags : [];
    }, [tagsData]);

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

    // Handle tag update for a mail item
    const handleTagUpdate = useCallback(async (item: MailItem, newTag: string | null) => {
        // Normalize both values for comparison (null vs undefined vs empty string)
        const currentTag = item.tag || null;
        const normalizedNewTag = newTag || null;

        // Skip API call if tag hasn't changed
        if (currentTag === normalizedNewTag) {
            return;
        }

        // Optimistic update: Update cache immediately for instant UI feedback
        if (mailData?.ok && Array.isArray(mailData.data)) {
            mutateMailItems({
                ...mailData,
                data: mailData.data.map((mailItem: MailItem) =>
                    mailItem.id === item.id
                        ? { ...mailItem, tag: normalizedNewTag }
                        : mailItem
                ),
            }, false); // false = don't revalidate yet
        }

        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ tag: normalizedNewTag }),
            });

            const data = await response.json();

            if (response.ok) {
                // Single revalidation after success
                mutateMailItems();
                toast({
                    title: "Tag Updated",
                    description: normalizedNewTag ? `Tag set to "${getTagLabel(normalizedNewTag)}"` : "Tag removed",
                    durationMs: 2000,
                });
            } else if (data.error === 'no_changes') {
                // Tag is already set to this value - revalidate to ensure sync
                mutateMailItems();
                toast({
                    title: "No Change Needed",
                    description: data.message || "Tag is already set to this value",
                    durationMs: 2000,
                });
                return;
            } else {
                // Revert optimistic update on error
                mutateMailItems();
                throw new Error(data.error || 'Failed to update tag');
            }
        } catch (error) {
            console.error('Error updating tag:', error);
            // Revert optimistic update on error
            mutateMailItems();
            toast({
                title: "Update Failed",
                description: "Failed to update tag. Please try again.",
                variant: "destructive",
                durationMs: 3000,
            });
        }
    }, [toast, getTagLabel, mailData, mutateMailItems]);

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
        <div className="w-full -mx-4 md:mx-0 px-4 md:px-0">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 tracking-tight">
                        Mail
                    </h1>
                    <span className="text-sm text-neutral-500 font-normal">{inboxCount} items</span>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={2} />
                    <Input
                        type="text"
                        placeholder="Search mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-lg border-neutral-200 bg-white text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                    />
                </div>
            </div>

            {/* Tag Filter Indicator */}
            {selectedTagFilter && activeTab === 'inbox' && (
                <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <span className="text-sm text-neutral-600 font-medium">
                        Filtered by:
                    </span>
                    <TagDot tag={selectedTagFilter} label={getTagLabel(selectedTagFilter)} />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearTagFilter}
                        className="h-7 px-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 ml-auto transition-colors duration-150"
                    >
                        <X className="h-3.5 w-3.5 mr-1" strokeWidth={2} />
                        Clear
                    </Button>
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as 'inbox' | 'archived' | 'tags');
                // Clear tag filter when switching tabs
                if (v !== 'inbox') {
                    setSelectedTagFilter(null);
                }
            }} className="mb-6 md:mb-8">
                <div className="sticky top-[56px] md:top-0 md:static z-20 bg-white md:bg-transparent -mx-4 md:mx-0 px-4 md:px-0 pb-3 md:pb-0 border-b border-neutral-200 md:border-b-0">
                    <TabsList className={cn(
                        "bg-transparent border-b-0 rounded-none p-0 h-auto gap-1",
                        "md:border-b md:border-neutral-200 md:gap-0"
                    )}>
                        <TabsTrigger
                            value="inbox"
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-3 text-sm font-medium",
                                "rounded-lg md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                "data-[state=active]:bg-primary data-[state=active]:text-white",
                                "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                "text-neutral-600 hover:text-neutral-900",
                                "transition-all duration-150"
                            )}
                        >
                            <span className="md:hidden">Inbox</span>
                            <span className="hidden md:inline">Inbox · {inboxCount}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="archived"
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-3 text-sm font-medium",
                                "rounded-lg md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                "data-[state=active]:bg-primary data-[state=active]:text-white",
                                "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                "text-neutral-600 hover:text-neutral-900",
                                "transition-all duration-150"
                            )}
                        >
                            <span className="md:hidden">Archived</span>
                            <span className="hidden md:inline">Archived · {archivedCount}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="tags"
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-5 py-2.5 md:py-3 text-sm font-medium",
                                "rounded-lg md:rounded-none border-0 md:border-b-2 md:border-transparent",
                                "data-[state=active]:bg-primary data-[state=active]:text-white",
                                "md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:border-primary",
                                "text-neutral-600 hover:text-neutral-900",
                                "transition-all duration-150"
                            )}
                        >
                            <span className="md:hidden">Tags</span>
                            <span className="hidden md:inline">Tags · {tagsCount}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>

            {/* In-place replacement: Show list OR detail, not both */}
            {selectedMailDetail ? (
                /* Mail Detail View - Full-screen on mobile, in-place on desktop */
                <div className="w-full md:relative fixed inset-0 md:inset-auto bg-white md:bg-transparent z-50 md:z-auto overflow-y-auto md:overflow-visible md:static">
                    <div className="p-4 md:p-0 max-w-full md:max-w-none pb-8 md:pb-0">
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
                /* Mail List View */
                <div className="w-full space-y-2">
                    {mailLoading ? (
                        <div className="py-16 md:py-16 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-4"></div>
                            <p className="text-sm text-neutral-600">Loading mail...</p>
                        </div>
                    ) : mailError ? (
                        <div className="py-16 md:py-16 text-center">
                            <Mail className="h-12 w-12 mx-auto mb-4 text-neutral-300" strokeWidth={1.5} />
                            <p className="text-sm text-neutral-600 font-medium mb-1">Failed to load mail</p>
                            <p className="text-xs text-neutral-500">Please refresh the page to try again</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-16 md:py-16 text-center">
                            <Mail className="h-12 w-12 mx-auto mb-4 text-neutral-300" strokeWidth={1.5} />
                            <p className="text-sm text-neutral-600 font-medium mb-1">No mail items</p>
                            <p className="text-xs text-neutral-500">Your mail will appear here when it arrives</p>
                        </div>
                    ) : activeTab === 'tags' && groupedByTag && groupedByTag.length > 0 ? (
                        /* Grouped Tags View */
                        <div className="space-y-6">
                            {/* Manage Tags Button */}
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowManageTagsModal(true);
                                        setManageTagAction(null);
                                    }}
                                    className="h-9 px-3 rounded-lg transition-all duration-150"
                                >
                                    <Tag className="h-4 w-4 mr-2" strokeWidth={2} />
                                    Manage Tags
                                </Button>
                            </div>
                            {groupedByTag.map(({ tag, items, count }) => {
                                const isCollapsed = collapsedTags.has(tag);
                                const colorClass = getTagColor(tag);

                                return (
                                    <div key={tag} className="space-y-3">
                                        {/* Tag Header */}
                                        <div className="sticky top-[56px] md:top-0 z-10 bg-white py-2.5 md:py-2 border-b border-neutral-200">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => handleCollapseToggle(tag, e)}
                                                    className="flex-shrink-0 p-1.5 hover:bg-neutral-100 rounded-md transition-colors duration-150"
                                                    aria-label={isCollapsed ? "Expand" : "Collapse"}
                                                >
                                                    {isCollapsed ? (
                                                        <ChevronRight className="h-4 w-4 text-neutral-500" strokeWidth={2} />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-neutral-500" strokeWidth={2} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleTagHeaderClick(tag)}
                                                    className="flex-1 flex items-center gap-2.5 hover:bg-neutral-50 -mx-1 px-2 py-1.5 rounded-md transition-colors duration-150 group text-left"
                                                >
                                                    <div className={cn('h-2 w-2 rounded-full flex-shrink-0', colorClass)} />
                                                    <div className="flex items-baseline gap-2">
                                                        <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
                                                            {getTagLabel(tag)}
                                                        </h2>
                                                        <span className="text-sm font-normal text-neutral-500">{count} items</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                        {/* Mail Items for this Tag */}
                                        {!isCollapsed && (
                                            <div className="space-y-2 pb-6 md:pb-6">
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
                                                                "flex items-center gap-4 md:gap-5 rounded-lg border px-5 md:px-6 py-4 md:py-5",
                                                                "bg-white hover:bg-neutral-50 active:bg-neutral-100 transition-colors duration-150",
                                                                "border-neutral-200 hover:border-primary/30 hover:shadow-sm",
                                                                "cursor-pointer min-h-[56px] md:min-h-0"
                                                            )}
                                                        >
                                                            {/* Mobile: Icon + Sender/Tag + Date */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 md:hidden">
                                                                <div className="flex-shrink-0">
                                                                    <Icon className={cn(
                                                                        "h-5 w-5",
                                                                        isRead ? 'text-neutral-400' : 'text-neutral-700'
                                                                    )} strokeWidth={2} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className={cn(
                                                                            "text-[15px] leading-tight truncate",
                                                                            isRead ? 'font-normal text-neutral-600' : 'font-semibold text-neutral-900'
                                                                        )}>
                                                                            {senderName}
                                                                        </p>
                                                                        {item.tag && (
                                                                            <TagDot tag={item.tag} label={getTagLabel(item.tag)} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-neutral-500 whitespace-nowrap flex-shrink-0 tabular-nums">
                                                                    {date}
                                                                </span>
                                                            </div>

                                                            {/* Desktop: Sender/Subject + Date */}
                                                            <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
                                                                <div className="flex-shrink-0">
                                                                    <Icon className={cn(
                                                                        "h-5 w-5",
                                                                        isRead ? 'text-neutral-400' : 'text-neutral-700'
                                                                    )} strokeWidth={2} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={cn(
                                                                        "text-[15px] leading-tight truncate mb-0.5",
                                                                        isRead ? 'font-medium text-neutral-700' : 'font-semibold text-neutral-900'
                                                                    )}>
                                                                        {senderName}
                                                                    </p>
                                                                    {item.subject && item.subject !== senderName && (
                                                                        <p className="text-sm text-neutral-500 truncate leading-tight">
                                                                            {item.subject}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-neutral-500 whitespace-nowrap min-w-[72px] text-right tabular-nums">
                                                                    {date}
                                                                </span>
                                                            </div>

                                                            {/* Desktop: Hidden section for Tags view (no actions needed) */}
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
                                                                        className="h-9 px-3 text-sm text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F9F9F9]"
                                                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                                                    >
                                                                        <ArchiveRestore className="h-4 w-4 mr-1.5" />
                                                                        Unarchive
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => handleArchive(item, e)}
                                                                        className="h-9 px-3 text-sm text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F9F9F9]"
                                                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                                                    >
                                                                        <Archive className="h-4 w-4 mr-1.5" />
                                                                        Archive
                                                                    </Button>
                                                                )}
                                                                <span className="text-xs text-[#999999] whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
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
                                        "flex items-center gap-4 md:gap-5 rounded-lg border px-5 md:px-6 py-4 md:py-5",
                                        "bg-white hover:bg-neutral-50 active:bg-neutral-100 transition-colors duration-150",
                                        "border-neutral-200 hover:border-primary/30 hover:shadow-sm",
                                        "cursor-pointer min-h-[56px] md:min-h-0"
                                    )}
                                >
                                    {/* Mobile: Icon + Sender/Tag + Date */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0 md:hidden">
                                        <div className="flex-shrink-0">
                                            <Icon className={cn(
                                                "h-5 w-5",
                                                isRead ? 'text-neutral-400' : 'text-neutral-700'
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={cn(
                                                    "text-[15px] leading-tight truncate",
                                                    isRead ? 'font-normal text-neutral-600' : 'font-semibold text-neutral-900'
                                                )}>
                                                    {senderName}
                                                </p>
                                                {item.tag && (
                                                    <TagDot tag={item.tag} label={getTagLabel(item.tag)} />
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-neutral-500 whitespace-nowrap flex-shrink-0 tabular-nums">
                                            {date}
                                        </span>
                                    </div>

                                    {/* Desktop: Sender/Subject */}
                                    <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            <Icon className={cn(
                                                "h-5 w-5",
                                                isRead ? 'text-neutral-400' : 'text-neutral-700'
                                            )} strokeWidth={2} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-[15px] leading-tight truncate mb-0.5",
                                                isRead ? 'font-medium text-neutral-700' : 'font-semibold text-neutral-900'
                                            )}>
                                                {senderName}
                                            </p>
                                            {item.subject && item.subject !== senderName && (
                                                <p className="text-sm text-neutral-500 truncate leading-tight">
                                                    {item.subject}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop: Tag + Archive + Date */}
                                    <div className="hidden md:flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                                className="h-8 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                                            >
                                                <ArchiveRestore className="h-4 w-4 mr-1.5" strokeWidth={2} />
                                                Unarchive
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleArchive(item, e)}
                                                className="h-8 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                                            >
                                                <Archive className="h-4 w-4 mr-1.5" strokeWidth={2} />
                                                Archive
                                            </Button>
                                        )}

                                        <span className="text-xs text-neutral-500 whitespace-nowrap min-w-[72px] text-right tabular-nums">
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
                    forwardingAddress={profile?.forwarding_address}
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
                                        {availableTags.map((tag: string) => (
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
                                <div className="space-y-2">
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
                                    <Button
                                        onClick={() => setManageTagAction('delete')}
                                        variant="destructive"
                                        className="w-full"
                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                    >
                                        Delete Tag
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
                    ) : manageTagAction === 'merge' ? (
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
                                            .filter((tag: string) => tag !== selectedTagForManage)
                                            .map((tag: string) => (
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
                    ) : (
                        /* Delete Tag Confirmation */
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <p className="text-sm text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    This will remove the tag <strong>"{getTagLabel(selectedTagForManage)}"</strong> from all active mail items.
                                    Archived mail is unaffected.
                                </p>
                                <p className="text-sm font-medium text-destructive" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    This action cannot be undone.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setManageTagAction(null);
                                    }}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleTagDelete}
                                    variant="destructive"
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Delete Tag
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
