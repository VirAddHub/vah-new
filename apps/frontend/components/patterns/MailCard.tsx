// components/patterns/MailCard.tsx
// Mobile-first card pattern for displaying mail items (replaces table on mobile)

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, Eye, Download, Forward, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface MailItem {
    id: number;
    item_id: string;
    name?: string;
    path?: string;
    sender_name?: string;
    sender_address?: string;
    received_date?: string;
    is_read?: boolean;
    status?: string;
    created_at_ms?: number;
    last_modified_at_ms?: number;
}

interface MailCardProps {
    item: MailItem;
    onView?: (item: MailItem) => void;
    onDownload?: (item: MailItem) => void;
    onForward?: (item: MailItem) => void;
    onDelete?: (item: MailItem) => void;
    onToggleRead?: (item: MailItem) => void;
    className?: string;
}

export function MailCard({
    item,
    onView,
    onDownload,
    onForward,
    onDelete,
    onToggleRead,
    className,
}: MailCardProps) {
    const displayDate = item.received_date
        ? new Date(item.received_date).toLocaleDateString()
        : item.last_modified_at_ms
        ? new Date(item.last_modified_at_ms).toLocaleDateString()
        : item.created_at_ms
        ? new Date(item.created_at_ms).toLocaleDateString()
        : '';

    return (
        <article
            className={cn(
                'rounded-xl border p-3 md:p-4',
                'bg-card text-card-foreground',
                'shadow-sm hover:shadow-md transition-shadow',
                !item.is_read && 'border-l-4 border-l-primary',
                className
            )}
        >
            <div className="flex items-start gap-3">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-fluid-base line-clamp-2">
                            {item.name || item.sender_name || item.path || 'Mail Item'}
                        </h3>
                        {!item.is_read && (
                            <Badge variant="default" className="shrink-0 text-xs">
                                New
                            </Badge>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                        {item.sender_name && (
                            <p className="truncate">
                                <span className="font-medium">From:</span> {item.sender_name}
                            </p>
                        )}
                        {item.sender_address && (
                            <p className="truncate text-xs">{item.sender_address}</p>
                        )}
                        {displayDate && (
                            <p className="text-xs">
                                <span className="font-medium">Received:</span> {displayDate}
                            </p>
                        )}
                        {item.status && (
                            <Badge variant="outline" className="text-xs mt-1">
                                {item.status}
                            </Badge>
                        )}
                    </div>

                    {/* Quick actions (mobile) */}
                    <div className="flex gap-2 mt-3 md:hidden">
                        {onView && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onView(item)}
                                className="flex-1 h-9"
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                            </Button>
                        )}
                        {onDownload && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDownload(item)}
                                className="h-9"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* More actions menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] rounded-lg shrink-0"
                            aria-label="More actions"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {onView && (
                            <DropdownMenuItem onClick={() => onView(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </DropdownMenuItem>
                        )}
                        {onDownload && (
                            <DropdownMenuItem onClick={() => onDownload(item)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </DropdownMenuItem>
                        )}
                        {onForward && (
                            <DropdownMenuItem onClick={() => onForward(item)}>
                                <Forward className="h-4 w-4 mr-2" />
                                Forward
                            </DropdownMenuItem>
                        )}
                        {onToggleRead && (
                            <DropdownMenuItem onClick={() => onToggleRead(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Mark as {item.is_read ? 'Unread' : 'Read'}
                            </DropdownMenuItem>
                        )}
                        {onDelete && (
                            <DropdownMenuItem
                                onClick={() => onDelete(item)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </article>
    );
}

// List container for mail cards
export function MailCardList({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-3 md:gap-4', className)}>
            {children}
        </div>
    );
}
