'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Building2, FileText, Landmark, Settings, Search, X, Download, Eye, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDashboardView } from '@/contexts/DashboardViewContext';
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
    const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

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

    // Handle mail item click - show details on right instead of navigating
    const handleMailClick = useCallback((item: MailItem) => {
        setSelectedMailId(String(item.id));
    }, []);

    // Get selected mail item
    const selectedMail = useMemo(() => {
        if (!selectedMailId) return null;
        return filteredItems.find((item: MailItem) => String(item.id) === selectedMailId) || null;
    }, [selectedMailId, filteredItems]);

    // Fetch mail item details if selected
    const { data: mailDetailData } = useSWR(
        selectedMailId ? `/api/bff/mail-items/${selectedMailId}` : null,
        swrFetcher
    );

    const mailDetails = mailDetailData?.ok ? mailDetailData.data : null;

    const handleView = useCallback(() => {
        if (mailDetails?.file_url) {
            window.open(mailDetails.file_url, '_blank');
        }
    }, [mailDetails]);

    const handleDownload = useCallback(async () => {
        if (!selectedMailId || !mailDetails?.file_url) return;
        try {
            const response = await fetch(`/api/bff/mail-items/${selectedMailId}/download`, {
                credentials: 'include',
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = mailDetails.file_name || `mail-${selectedMailId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    }, [selectedMailId, mailDetails]);

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

            {/* Split-pane layout: List on left, Details on right */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                {/* Left: Mail List */}
                <div className="space-y-3">
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
                            const isSelected = selectedMailId === String(item.id);
                            
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

                {/* Right: Mail Details Panel */}
                {selectedMail && (
                    <div className="lg:sticky lg:top-6 h-fit bg-white border border-[#E5E7EB] rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                            <h2 className="text-xl font-semibold text-[#1A1A1A]">Mail Details</h2>
                            <button
                                onClick={() => setSelectedMailId(null)}
                                className="text-[#666666] hover:text-[#1A1A1A] transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {mailDetails ? (
                            <div className="space-y-6">
                                {/* Header with icon and title */}
                                <div className="flex items-start gap-4">
                                    {(() => {
                                        const Icon = getMailIcon(selectedMail);
                                        return <Icon className="h-8 w-8 text-[#024E40] flex-shrink-0 mt-1" />;
                                    })()}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-[#1A1A1A] break-words">
                                            {selectedMail.sender_name || selectedMail.subject || 'Mail Item'}
                                        </h3>
                                        {selectedMail.subject && selectedMail.subject !== selectedMail.sender_name && (
                                            <p className="text-sm text-[#666666] mt-1 break-words">
                                                {selectedMail.subject}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4 pt-4 border-t border-[#E5E7EB]">
                                    <button
                                        onClick={handleView}
                                        className="flex flex-col items-center gap-2 text-[#666666] hover:text-[#1A1A1A] transition-colors"
                                    >
                                        <Eye className="h-5 w-5" />
                                        <span className="text-xs font-medium">View</span>
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="flex flex-col items-center gap-2 text-[#666666] hover:text-[#1A1A1A] transition-colors"
                                    >
                                        <Download className="h-5 w-5" />
                                        <span className="text-xs font-medium">Download</span>
                                    </button>
                                    <button
                                        onClick={() => router.push(`/forwarding?mailId=${selectedMail.id}`)}
                                        className="flex flex-col items-center gap-2 text-[#666666] hover:text-[#1A1A1A] transition-colors"
                                    >
                                        <Truck className="h-5 w-5" />
                                        <span className="text-xs font-medium">Forward</span>
                                    </button>
                                </div>

                                {/* Details */}
                                <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
                                    <div className="text-sm font-medium text-[#1A1A1A] mb-3">Details</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[#666666]">From:</span>
                                            <span className="text-[#1A1A1A] font-medium text-right break-words max-w-[60%]">
                                                {mailDetails.sender_name || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#666666]">Subject:</span>
                                            <span className="text-[#1A1A1A] font-medium text-right break-words max-w-[60%]">
                                                {mailDetails.subject || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#666666]">Received:</span>
                                            <span className="text-[#1A1A1A] font-medium">
                                                {formatDate(mailDetails.received_date || mailDetails.created_at)}
                                            </span>
                                        </div>
                                        {mailDetails.tag && (
                                            <div className="flex justify-between">
                                                <span className="text-[#666666]">Tag:</span>
                                                <Badge className="bg-[#F9F9F9] text-[#666666] font-normal">
                                                    {mailDetails.tag}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-sm text-[#666666]">
                                Loading details...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
