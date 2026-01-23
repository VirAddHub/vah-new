'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Building2, FileText, Landmark, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MailItem } from '@/components/dashboard/user/types';

export default function MailInboxPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');

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

    // Handle mail item click
    const handleMailClick = useCallback((item: MailItem) => {
        router.push(`/mail/${item.id}`);
    }, [router]);


    return (
        <div className="w-full">
                {/* Header */}
                <div className="flex flex-col gap-[20px] mb-[40px]">
                    <div className="flex items-center justify-between">
                        <h1 className="text-[28px] font-medium leading-[1.2] text-[#101828]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Mail Inbox
                        </h1>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-[56px] w-[100px] rounded-[4px] bg-[#40C46C] text-[#161B1A] hover:bg-[#40C46C]/90"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            <Settings className="h-5 w-5 mr-2" />
                            Setting
                        </Button>
                    </div>
                    <div className="w-full h-[1px] bg-[#ECECEC]"></div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-[30px]">
                    {/* Top Section: Inbox Count + Search */}
                    <div className="flex items-center justify-between gap-[640px]">
                        <div className="flex flex-col gap-[20px]">
                            <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Inbox ({inboxCount})
                            </h2>
                        </div>
                        <div className="flex-1 max-w-[1206px]">
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Search mail by sender, subject, tag, or date..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-auto px-[20px] py-[20px] rounded-[48px] bg-[#F9F9F9] border-0 text-[16px] font-normal leading-[1.5] text-[rgba(26,26,26,0.5)] placeholder:text-[rgba(26,26,26,0.5)] focus:outline-none focus:ring-0"
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar + Mail List */}
                    <div className="flex gap-[17px] items-start">
                        {/* Sidebar */}
                        <div className="flex flex-col gap-0 w-[90px] flex-shrink-0">
                            {/* Inbox (13) - Active */}
                            <div className="flex flex-col gap-[8px]">
                                <button
                                    onClick={() => setActiveTab('inbox')}
                                    className={`text-[18px] leading-[1.11] text-left ${
                                        activeTab === 'inbox' ? 'font-semibold text-[#024E40]' : 'font-normal text-[#666666]'
                                    }`}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Inbox ({inboxCount})
                                </button>
                                {activeTab === 'inbox' && (
                                    <div className="w-full h-[2px] bg-[#5AE094]"></div>
                                )}
                            </div>

                            {/* Archived (7) */}
                            <div className="flex flex-col gap-[8px] mt-[34px]">
                                <button
                                    onClick={() => setActiveTab('archived')}
                                    className={`text-[18px] leading-[1.11] text-left ${
                                        activeTab === 'archived' ? 'font-semibold text-[#024E40]' : 'font-normal text-[#666666]'
                                    }`}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Archived ({archivedCount})
                                </button>
                                {activeTab === 'archived' && (
                                    <div className="w-full h-[2px] bg-[#5AE094]"></div>
                                )}
                            </div>

                            {/* Tags (20) */}
                            <div className="flex flex-col gap-[8px] mt-[34px]">
                                <button
                                    onClick={() => setActiveTab('tags')}
                                    className={`text-[18px] leading-[1.11] text-left ${
                                        activeTab === 'tags' ? 'font-semibold text-[#024E40]' : 'font-normal text-[#6A7282]'
                                    }`}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    Tags ({tagsCount})
                                </button>
                                {activeTab === 'tags' && (
                                    <div className="w-full h-[2px] bg-[#5AE094]"></div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="w-full h-[2px] bg-[#E5E7EB] mt-[40px]"></div>
                        </div>

                        {/* Mail List */}
                        <div className="flex-1 flex flex-col gap-0">
                            {mailLoading ? (
                                <div className="py-12 text-center text-[16px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Loading mail...
                                </div>
                            ) : mailError ? (
                                <div className="py-12 text-center text-[16px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Failed to load mail. Please try again.
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="py-12 text-center text-[16px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    No mail items found.
                                </div>
                            ) : (
                                filteredItems.map((item, index) => {
                                    const Icon = getMailIcon(item);
                                    const senderName = getSenderName(item);
                                    const date = formatDate(item.received_date || item.created_at);
                                    const isRead = item.is_read ?? true;
                                    
                                    return (
                                        <div key={item.id}>
                                            <button
                                                onClick={() => handleMailClick(item)}
                                                className="w-full flex items-center gap-[8px] px-[16px] py-[10px] bg-[#F9F9F9] hover:bg-[#F0F0F0] transition-colors"
                                            >
                                                {/* Icon */}
                                                <div className="w-[16px] h-[60px] flex items-center justify-center flex-shrink-0">
                                                    <Icon className={`w-4 h-4 ${isRead ? 'text-[#666666]' : 'text-[#1A1A1A]'}`} />
                                                </div>

                                                {/* Sender Name and Date */}
                                                <div className="flex flex-col gap-[4px] flex-1 min-w-0">
                                                    <div className={`text-[16px] leading-[1.4] truncate ${
                                                        isRead ? 'font-normal text-[#666666]' : 'font-medium text-[#1A1A1A]'
                                                    }`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                        {senderName}
                                                    </div>
                                                    <div className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                        {date}
                                                    </div>
                                                </div>
                                            </button>
                                            {index < filteredItems.length - 1 && (
                                                <div className="w-full h-[0.5px] bg-[#E5E7EB]"></div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
        </div>
    );
}
