'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { useMail, useTags, useProfile } from '@/hooks/useDashboardData';
import { useActiveBusiness } from '@/contexts/ActiveBusinessContext';
import { Building2, FileText, Landmark, Search, ChevronDown, ChevronRight, Archive, ArchiveRestore, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { MailDetail } from '@/components/dashboard/user/MailDetail';
import PDFViewerModal from '@/components/PDFViewerModal';
import { ForwardingRequestModal } from '@/components/ForwardingRequestModal';
import { useToast } from '@/components/ui/use-toast';
import type { MailItem } from '@/components/dashboard/user/types';
import { CreatableTagSelect } from '@/components/dashboard/user/CreatableTagSelect';
import { getMailItemPrimaryLabel, mailItemMatchesSearchQuery } from '@/lib/mailItemDates';

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'archived' | 'forwarded';
type SortOrder = 'newest' | 'oldest';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Inbox' },
    { key: 'archived', label: 'Archived' },
    { key: 'forwarded', label: 'Forward requested' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMailItemTimestamp(item: MailItem): number {
    const raw = item.received_at_ms ?? item.created_at ?? item.received_date;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const n = Number(raw);
        if (!isNaN(n) && n > 1e10) return n; // ms epoch
        const d = new Date(raw);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return 0;
}


function isForwardRequestedItem(item: MailItem): boolean {
    return Boolean(item.forwarding_status);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MailInboxPage() {
    const { mutate } = useSWRConfig();
    const { isMobileSidebarOpen } = useDashboardView();
    const { activeBusinessId } = useActiveBusiness();

    // Filter / sort state
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

    // Mail detail state
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

    // Data fetching
    const { data: mailData, error: mailError, isLoading: mailLoading, mutate: mutateMailItems } = useMail(activeBusinessId ?? undefined);
    const { data: tagsData, mutate: mutateTags } = useTags();
    const { data: profileData } = useProfile();
    const profile = profileData?.data;

    const mailItems = useMemo<MailItem[]>(() => {
        if (!mailData?.ok) return [];
        return Array.isArray(mailData.items) ? mailData.items : [];
    }, [mailData]);

    // Available tags: merge API tags with tags actually used in items
    const availableTags = useMemo<string[]>(() => {
        const fromApi: string[] = tagsData?.ok && Array.isArray(tagsData.tags) ? tagsData.tags : [];
        const fromItems = new Set<string>(fromApi);
        mailItems.forEach(i => { if (i.tag) fromItems.add(i.tag); });
        return Array.from(fromItems).sort();
    }, [tagsData, mailItems]);

    // Per-status counts (computed before filtering so chips always show totals)
    const statusCounts = useMemo(() => ({
        all: mailItems.filter(i => !i.deleted).length,
        archived: mailItems.filter(i => i.deleted).length,
        forwarded: mailItems.filter(i => !i.deleted && isForwardRequestedItem(i)).length,
    }), [mailItems]);

    // Filtered + sorted items
    const filteredItems = useMemo<MailItem[]>(() => {
        let items = mailItems;

        // TODO: pass statusFilter/tag/sort as query params to backend once
        // the /api/mail-items endpoint supports ?status=&tag=&sort= params.
        // For now, all filtering is done client-side on the full fetched list.

        switch (statusFilter) {
            case 'archived':
                items = items.filter(i => i.deleted);
                break;
            case 'forwarded':
                items = items.filter(i => !i.deleted && isForwardRequestedItem(i));
                break;
            case 'all':
            default:
                items = items.filter(i => !i.deleted);
                break;
        }

        if (selectedTagFilter) {
            if (selectedTagFilter === 'untagged') {
                items = items.filter(i => !i.tag);
            } else {
                items = items.filter(i => i.tag === selectedTagFilter);
            }
        }

        if (searchQuery.trim()) {
            items = items.filter(i => mailItemMatchesSearchQuery(i, searchQuery));
        }

        return [...items].sort((a, b) => {
            const ta = getMailItemTimestamp(a);
            const tb = getMailItemTimestamp(b);
            return sortOrder === 'oldest' ? ta - tb : tb - ta;
        });
    }, [mailItems, statusFilter, selectedTagFilter, searchQuery, sortOrder]);

    const tagMeta: Record<string, { label: string }> = {
        hmrc: { label: 'HMRC' },
        companies_house: { label: 'Companies House' },
        companieshouse: { label: 'Companies House' },
        bank: { label: 'Bank' },
        insurance: { label: 'Insurance' },
        utilities: { label: 'Utilities' },
        other: { label: 'Other' },
    };

    const humanizeTag = useCallback((slug: string): string =>
        slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        []
    );

    const getTagLabel = useCallback((t: string | null | undefined): string => {
        if (!t) return 'Add tag';
        return tagMeta[t]?.label || humanizeTag(t);
    }, [humanizeTag]);

    const patchMailItemsCache = useCallback(
        (updater: (items: MailItem[]) => MailItem[]) => {
            if (!mailData?.ok || !Array.isArray(mailData.items)) return;
            mutateMailItems({ ...mailData, items: updater(mailData.items) }, false);
        },
        [mailData, mutateMailItems]
    );

    const handleTagUpdate = useCallback(async (item: MailItem, newTag: string | null) => {
        const currentTag = item.tag || null;
        const normalizedNewTag = newTag || null;
        if (currentTag === normalizedNewTag) return;

        patchMailItemsCache(items =>
            items.map(m => m.id === item.id ? { ...m, tag: normalizedNewTag ?? undefined } : m)
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
            if (data.error === 'no_changes') { await mutateMailItems(); return; }
            await mutateMailItems();
            throw new Error(data.error || 'Failed to update tag');
        } catch (error) {
            console.error('Error updating tag:', error);
            await mutateMailItems();
            toast({ title: 'Update Failed', description: 'Failed to update tag. Please try again.', variant: 'destructive', durationMs: 3000 });
        }
    }, [toast, patchMailItemsCache, mutateMailItems, mutateTags]);

    const getMailIcon = (item: MailItem) => {
        const combined = `${item.tag || ''} ${item.sender_name || ''} ${item.subject || ''}`.toLowerCase();
        if (combined.includes('bank') || combined.includes('barclays') || combined.includes('hsbc') || combined.includes('lloyds')) return Landmark;
        if (combined.includes('hmrc') || combined.includes('companies house') || combined.includes('gov')) return Building2;
        return FileText;
    };

    const handleArchive = useCallback(async (item: MailItem, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (response.ok) {
                toast({ title: 'Mail Archived', description: 'Mail item has been moved to archive', durationMs: 2000 });
                mutateMailItems();
            } else {
                mutateMailItems();
                throw new Error('Failed to archive mail');
            }
        } catch (error) {
            console.error('Error archiving mail:', error);
            mutateMailItems();
            toast({ title: 'Archive Failed', description: 'Failed to archive mail. Please try again.', variant: 'destructive', durationMs: 3000 });
        }
    }, [toast, mutateMailItems]);

    const handleUnarchive = useCallback(async (item: MailItem, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            const response = await fetch(`/api/bff/mail-items/${item.id}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (response.ok) {
                toast({ title: 'Mail Restored', description: 'Mail item has been moved back to inbox', durationMs: 2000 });
                mutateMailItems();
            } else {
                mutateMailItems();
                throw new Error('Failed to restore mail');
            }
        } catch (error) {
            console.error('Error restoring mail:', error);
            mutateMailItems();
            toast({ title: 'Restore Failed', description: 'Failed to restore mail. Please try again.', variant: 'destructive', durationMs: 3000 });
        }
    }, [toast, mutateMailItems]);

    const handleMailClick = useCallback((item: MailItem) => {
        setScrollPosition(window.scrollY);
        setSelectedMailDetail(item);
        setSelectedMailForPDF(item);
        setShowPDFModal(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleBack = useCallback(() => {
        setSelectedMailDetail(null);
        setTimeout(() => window.scrollTo({ top: scrollPosition, behavior: 'smooth' }), 100);
    }, [scrollPosition]);

    const markAsRead = useCallback(async (item: MailItem) => {
        try {
            await fetch(`/api/bff/mail-items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_read: true }),
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }, []);

    const handleView = useCallback(() => {
        if (selectedMailDetail) { setSelectedMailForPDF(selectedMailDetail); setShowPDFModal(true); }
    }, [selectedMailDetail]);

    const handleForward = useCallback(() => {
        if (!selectedMailDetail) {
            toast({ title: 'No Mail Selected', description: 'Please select a mail item to forward.', variant: 'destructive' });
            return;
        }
        const receivedDate = selectedMailDetail.received_date || selectedMailDetail.created_at;
        if (receivedDate) {
            const daysDiff = Math.floor((Date.now() - new Date(receivedDate).getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 30) {
                setForwardInlineNotice('This mail item is older than 30 days and cannot be forwarded due to GDPR compliance.');
                return;
            }
        }
        setSelectedMailForForwarding(selectedMailDetail);
        setShowForwardingModal(true);
        setForwardInlineNotice(null);
    }, [selectedMailDetail, toast]);

    const handleForwardingSubmit = useCallback(async (data: any) => {
        if (!selectedMailForForwarding) return;
        try {
            const response = await fetch('/api/bff/forwarding/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mail_item_id: selectedMailForForwarding.id, ...data }),
            });
            if (response.ok) {
                const result = await response.json();
                if (result.ok) {
                    toast({ title: 'Forwarding Request Created', description: 'Your request will be reviewed by our team.', durationMs: 5000 });
                    setShowForwardingModal(false);
                    setSelectedMailForForwarding(null);
                } else {
                    toast({ title: 'Forwarding Request Failed', description: result.error || 'Unknown error', variant: 'destructive', durationMs: 5000 });
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error === 'forwarding_address_incomplete' && errorData.fields) {
                    const fieldLabels: Record<string, string> = { name: 'Full Name', address_line_1: 'Address Line 1', city: 'City', postal_code: 'Postcode' };
                    const missingLabels = (errorData.fields as string[]).map(f => fieldLabels[f] || f).join(', ');
                    toast({ title: 'Incomplete Forwarding Address', description: `Please add your ${missingLabels} before requesting forwarding. You can update your forwarding address in Account settings.`, variant: 'destructive', durationMs: 6000 });
                } else {
                    toast({ title: 'Request Failed', description: errorData.message || errorData.error || 'Failed to create forwarding request. Please try again.', variant: 'destructive', durationMs: 5000 });
                }
            }
        } catch (error) {
            console.error('Error creating forwarding request:', error);
            toast({ title: 'Request Error', description: 'Error creating forwarding request. Please try again.', variant: 'destructive', durationMs: 5000 });
        }
    }, [selectedMailForForwarding, toast]);

    useEffect(() => {
        if (selectedMailDetail && !selectedMailDetail.is_read) markAsRead(selectedMailDetail);
    }, [selectedMailDetail, markAsRead]);

    const formatTime = useCallback((d?: string | number) => {
        if (!d) return '—';
        const date = typeof d === 'number' ? new Date(d) : new Date(d);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    }, []);

    const mailTypeIcon = useCallback((item: MailItem) => getMailIcon(item), []);

    const mailStatusMeta = useCallback((item: MailItem) => {
        const raw = (item.status || '').toLowerCase();
        const isForwarded = raw.includes('forward');
        const isScanned = Boolean(item.scanned_at || item.file_url) || raw.includes('scan');
        const isNew = !item.is_read && !isForwarded;
        if (isForwarded) return { label: 'Forwarded', badgeClass: 'bg-primary text-white border-transparent' };
        if (isScanned) return { label: 'Scanned', badgeClass: 'bg-muted text-foreground border-transparent' };
        if (isNew) return { label: 'New', badgeClass: 'bg-blue-600 text-white border-transparent' };
        return { label: 'Received', badgeClass: 'bg-muted text-foreground border-transparent' };
    }, []);

    // PDF preview loader
    useEffect(() => {
        let cancelled = false;
        const ctrl = new AbortController();
        const revoke = (url: string | null) => { try { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); } catch { } };

        async function loadMini() {
            setMiniViewerError(null);
            setMiniViewerLoading(false);
            if (!selectedMailDetail?.id) { revoke(miniViewerUrl); setMiniViewerUrl(null); return; }
            setMiniViewerLoading(true);
            revoke(miniViewerUrl);
            setMiniViewerUrl(null);
            try {
                const mailItemId = selectedMailDetail.id;
                const url = `/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(String(mailItemId))}&disposition=inline`;
                const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
                const res = await fetch(url, {
                    credentials: 'include', cache: 'no-store', signal: ctrl.signal,
                    headers: { Accept: 'application/pdf', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                });
                if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(txt || `Failed to load preview (${res.status})`); }
                const ab = await res.arrayBuffer();
                const { isCheckpointOrHtmlResponse, SCAN_CHECKPOINT_MESSAGE: checkpointMsg } = await import('@/lib/scanUrlUtils');
                if (isCheckpointOrHtmlResponse(res.headers.get('Content-Type'), ab)) throw new Error(checkpointMsg);
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
        return () => { cancelled = true; ctrl.abort(); revoke(miniViewerUrl); };
    }, [selectedMailDetail?.id]);

    useEffect(() => {
        if (!forwardInlineNotice) return;
        const t = window.setTimeout(() => setForwardInlineNotice(null), 8000);
        return () => window.clearTimeout(t);
    }, [forwardInlineNotice]);

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="w-full min-w-0">
            {!selectedMailDetail && (
                <>
                    {/* Page title */}
                    <div className="mb-4 md:mb-6">
                        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Mail</h1>
                    </div>

                    {/* Search */}
                    <div className="relative w-full mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none shrink-0" strokeWidth={2} />
                        <Input
                            type="text"
                            placeholder="Search mail..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 rounded-lg border-border bg-card text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary border transition-colors md:w-80"
                        />
                    </div>

                    {/* Status filter — segmented control */}
                    <div className="mb-4">
                        <div className="flex border border-border rounded-[3px] overflow-hidden w-fit">
                            {STATUS_OPTIONS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setStatusFilter(key)}
                                    className={cn(
                                        'px-4 py-2 text-sm font-medium border-r border-border last:border-r-0 transition-colors whitespace-nowrap',
                                        statusFilter === key
                                            ? 'bg-muted text-foreground'
                                            : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    )}
                                >
                                    {label}
                                    {statusCounts[key] > 0 && (
                                        <span className="ml-1 opacity-60 tabular-nums text-[10px]">{statusCounts[key]}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tag + Sort row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                        {/* Tag dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-caption text-muted-foreground shrink-0">Tag</span>
                            <div className="relative">
                                <select
                                    value={selectedTagFilter ?? ''}
                                    onChange={e => setSelectedTagFilter(e.target.value || null)}
                                    className="h-9 pl-3 pr-7 text-sm rounded-lg border border-border bg-card text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                >
                                    <option value="">All tags</option>
                                    <option value="untagged">Untagged</option>
                                    {availableTags.map(t => (
                                        <option key={t} value={t}>{getTagLabel(t)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" strokeWidth={2} />
                            </div>
                        </div>

                        {/* Sort dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-caption text-muted-foreground shrink-0">Sort</span>
                            <div className="relative">
                                <select
                                    value={sortOrder}
                                    onChange={e => setSortOrder(e.target.value as SortOrder)}
                                    className="h-9 pl-3 pr-7 text-sm rounded-lg border border-border bg-card text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" strokeWidth={2} />
                            </div>
                        </div>
                    </div>

                    {/* Item count */}
                    <p className="text-sm text-muted-foreground mb-3 py-1 tabular-nums">
                        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                    </p>
                </>
            )}

            {/* Detail or list view */}
            {selectedMailDetail ? (
                <div className="w-full md:relative fixed inset-0 md:inset-auto bg-card md:bg-transparent z-50 md:z-auto overflow-y-auto md:overflow-visible md:static">
                    <div className="min-w-0 max-w-full px-4 py-3 pb-8 md:max-w-none md:p-0 md:pb-0">
                        <MailDetail
                            item={selectedMailDetail}
                            onBack={handleBack}
                            onView={handleView}
                            onForward={handleForward}
                            onArchive={selectedMailDetail.deleted ? undefined : async () => {
                                await handleArchive(selectedMailDetail, { stopPropagation: () => { } } as React.MouseEvent);
                                handleBack();
                            }}
                            onUnarchive={selectedMailDetail.deleted ? async () => {
                                await handleUnarchive(selectedMailDetail, { stopPropagation: () => { } } as React.MouseEvent);
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
                <div className="w-full border border-border rounded-[3px] overflow-hidden">
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
                            <p className="text-caption text-muted-foreground">
                                {searchQuery || selectedTagFilter || statusFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Your mail will appear here when it arrives'}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const Icon = getMailIcon(item);
                            const rowLabel = getMailItemPrimaryLabel(item);
                            const isRead = item.is_read ?? true;
                            const isUnread = !isRead;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleMailClick(item)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMailClick(item); } }}
                                    className={cn(
                                        'group flex flex-col md:flex-row md:items-center gap-2 md:gap-4',
                                        'border-b border-border px-4 py-3 md:px-6 md:py-3.5',
                                        'bg-card hover:bg-muted/50 transition-colors',
                                        'cursor-pointer touch-manipulation min-w-0'
                                    )}
                                >
                                    {/* Mobile row */}
                                    <div className="flex items-center gap-2.5 w-full min-w-0 md:hidden">
                                        <Icon className="h-4 w-4 text-muted-foreground opacity-50 shrink-0" strokeWidth={1.5} />
                                        {isUnread && <span className="h-2 w-2 rounded-full bg-[#1a6b3c] shrink-0" aria-label="Unread" />}
                                        <p className={cn('flex-1 min-w-0 text-sm leading-tight truncate', isUnread ? 'font-medium text-foreground' : 'font-normal text-neutral-600')}>
                                            {rowLabel}
                                        </p>
                                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                            <CreatableTagSelect
                                                compact
                                                value={item.tag ?? null}
                                                availableTags={availableTags}
                                                onValueChange={newTag => handleTagUpdate(item, newTag)}
                                                getTagLabel={getTagLabel}
                                                className="w-auto"
                                            />
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-40" strokeWidth={1.5} />
                                    </div>

                                    {/* Desktop row */}
                                    <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                                        <Icon className="h-4 w-4 text-muted-foreground opacity-50 shrink-0" strokeWidth={1.5} />
                                        {isUnread && <span className="h-2 w-2 rounded-full bg-[#1a6b3c] shrink-0" aria-label="Unread" />}
                                        <p className={cn('flex-1 min-w-0 text-sm leading-tight truncate', isUnread ? 'font-medium text-foreground' : 'font-normal text-neutral-600')}>
                                            {rowLabel}
                                        </p>
                                    </div>

                                    {/* Desktop hover-reveal actions */}
                                    <div className="hidden md:flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <CreatableTagSelect
                                            compact
                                            value={item.tag ?? null}
                                            availableTags={availableTags}
                                            onValueChange={newTag => handleTagUpdate(item, newTag)}
                                            getTagLabel={getTagLabel}
                                            triggerClassName="rounded-[3px] bg-transparent border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground h-auto"
                                        />
                                        {item.deleted ? (
                                            <button type="button" onClick={e => handleUnarchive(item, e)} className="inline-flex items-center gap-1.5 border border-border rounded-[3px] px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                Unarchive
                                            </button>
                                        ) : (
                                            <button type="button" onClick={e => handleArchive(item, e)} className="inline-flex items-center gap-1.5 border border-border rounded-[3px] px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                Archive
                                            </button>
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
                    onClose={() => { setShowPDFModal(false); setSelectedMailForPDF(null); }}
                    mailItemId={selectedMailForPDF.id ? Number(selectedMailForPDF.id) : null}
                    mailItemSubject={getMailItemPrimaryLabel(selectedMailForPDF)}
                />
            )}

            {/* Forwarding Request Modal */}
            {showForwardingModal && selectedMailForForwarding && (
                <ForwardingRequestModal
                    isOpen={showForwardingModal}
                    onClose={() => { setShowForwardingModal(false); setSelectedMailForForwarding(null); }}
                    mailItem={selectedMailForForwarding}
                    forwardingAddress={profile?.forwarding_address}
                    onSubmit={handleForwardingSubmit}
                />
            )}
        </div>
    );
}
