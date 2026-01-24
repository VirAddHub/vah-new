'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Building2, FileText, Landmark, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { RightPanel } from '@/components/dashboard/user/RightPanel';
import PDFViewerModal from '@/components/PDFViewerModal';
import { useToast } from '@/components/ui/use-toast';
import type { MailItem } from '@/components/dashboard/user/types';

export default function MailInboxPage() {
    const router = useRouter();
    const { setActiveView } = useDashboardView();
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');

    // Set the active view when this component mounts
    useEffect(() => {
        setActiveView('mail');
    }, [setActiveView]);
    
    // Right panel state
    const [rightPanelView, setRightPanelView] = useState<'mail-detail' | 'forwarding' | 'account' | null>(null);
    const [selectedMailDetail, setSelectedMailDetail] = useState<MailItem | null>(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [selectedMailForPDF, setSelectedMailForPDF] = useState<MailItem | null>(null);
    const [miniViewerUrl, setMiniViewerUrl] = useState<string | null>(null);
    const [miniViewerLoading, setMiniViewerLoading] = useState(false);
    const [miniViewerError, setMiniViewerError] = useState<string | null>(null);
    const [forwardInlineNotice, setForwardInlineNotice] = useState<string | null>(null);
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
        } else if (activeTab === 'tags') {
            items = items.filter((item: MailItem) => item.tag && !item.deleted);
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
    }, [mailItems, activeTab, searchQuery]);

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

    // Handle mail item click - open in right panel
    const handleMailClick = useCallback((item: MailItem) => {
        setSelectedMailDetail(item);
        setRightPanelView('mail-detail');
        setSelectedMailForPDF(item);
        setShowPDFModal(false);
    }, []);

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
    const handleDownload = useCallback(async () => {
        if (!selectedMailDetail) return;
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('vah_jwt') : null;
            const response = await fetch(`/api/bff/mail-items/${selectedMailDetail.id}/download`, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mail-${selectedMailDetail.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Download error:', error);
            toast({
                title: 'Download Failed',
                description: 'Unable to download file. Please try again.',
                variant: 'destructive',
            });
        }
    }, [selectedMailDetail, toast]);

    // Forward handler
    const handleForward = useCallback(() => {
        if (!selectedMailDetail) return;
        
        // Check if GDPR expired (older than 30 days)
        const receivedDate = selectedMailDetail.received_date || selectedMailDetail.created_at;
        if (receivedDate) {
            const received = new Date(receivedDate);
            const now = new Date();
            const daysDiff = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 30) {
                setForwardInlineNotice('This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it.');
                return;
            }
        }
        
        // Open forwarding in right panel
        setRightPanelView('forwarding');
    }, [selectedMailDetail]);

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

            {/* Horizontal Tabs - Replaces the sidebar */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'archived' | 'tags')} className="mb-6">
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

            {/* Split-pane layout: List on left, RightPanel on right */}
            <div className="flex gap-6">
                {/* Left: Mail List */}
                <div className={cn(
                    "flex-1 space-y-3",
                    rightPanelView === 'mail-detail' ? "lg:w-2/3" : "w-full"
                )}>
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
                    ) : (
                        filteredItems.map((item) => {
                            const Icon = getMailIcon(item);
                            const senderName = getSenderName(item);
                            const date = formatDate(item.received_date || item.created_at);
                            const isRead = item.is_read ?? true;
                            const isSelected = selectedMailDetail?.id === item.id;
                            
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleMailClick(item)}
                                    className={cn(
                                        "flex items-center justify-between rounded-lg border px-6 py-4",
                                        "bg-white hover:bg-[#F9F9F9] cursor-pointer transition-all",
                                        isSelected 
                                            ? "border-[#40C46C] bg-[#F0FDF4]" 
                                            : "border-[#E5E7EB] hover:border-[#40C46C]/30 hover:shadow-sm"
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
                                            <span className="px-3 py-1 text-sm font-medium rounded-md bg-[#F9F9F9] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                {item.tag}
                                            </span>
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

                {/* Right: RightPanel with MailDetail */}
                <RightPanel
                    view={rightPanelView}
                    onClose={() => {
                        setRightPanelView(null);
                        setSelectedMailDetail(null);
                    }}
                    selectedMailDetail={selectedMailDetail}
                    onMailView={handleView}
                    onMailDownload={handleDownload}
                    onMailForward={handleForward}
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
        </div>
    );
}
