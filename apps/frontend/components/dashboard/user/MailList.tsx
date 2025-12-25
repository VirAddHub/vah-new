'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MailManagement } from '@/components/MailManagement';
import { AlertCircle, CheckSquare, Download, Mail, RefreshCw, Square, Truck } from 'lucide-react';
import type { MailItem } from './types';

interface MailListProps {
  mailItems: MailItem[];
  mailError: Error | null;
  mailLoading: boolean;
  selectedMail: string[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleSelectAll: () => void;
  refreshMail: () => void;
  onOpen: (item: MailItem) => void;
  onDownload: (item: MailItem) => void;
  onForward: (item?: MailItem) => void;
  formatScannedDate: (item: MailItem) => string | null;
}

export function MailList({
  mailItems,
  mailError,
  mailLoading,
  selectedMail,
  isAllSelected,
  isSomeSelected,
  toggleSelectAll,
  refreshMail,
  onOpen,
  onDownload,
  onForward,
  formatScannedDate,
}: MailListProps) {
  return (
    <>
      {/* Select All - Desktop */}
      <div className="hidden sm:block px-6 py-3 border-b bg-muted/30">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          disabled={mailItems.length === 0}
          type="button"
        >
          {isAllSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Select All - Mobile */}
      <div className="sm:hidden px-4 py-3 border-b bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectAll}
          className="w-full"
          disabled={mailItems.length === 0}
        >
          {isAllSelected ? (
            <>
              <CheckSquare className="h-4 w-4 mr-2 text-primary" />
              Deselect All ({mailItems.length})
            </>
          ) : (
            <>
              <Square className="h-4 w-4 mr-2" />
              Select All ({mailItems.length})
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {mailError ? (
        <div className="px-6 py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
          <h3 className="font-medium mb-2">Failed to load mail</h3>
          <p className="text-sm text-muted-foreground mb-4">{mailError.message}</p>
          <Button onClick={() => refreshMail()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : mailItems.length === 0 ? (
        /* Empty State */
        <div className="px-6 py-12 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No mail yet</h3>
          <p className="text-sm text-muted-foreground">
            Your mail will appear here when it arrives at your virtual address
          </p>
        </div>
      ) : (
        <MailManagement
          mailItems={mailItems}
          onRefresh={refreshMail}
          onOpen={onOpen}
          onDownload={onDownload}
          onForward={onForward}
          formatScannedDate={formatScannedDate}
        />
      )}

      {/* Bulk Actions Notice - Mobile */}
      {isSomeSelected && (
        <div className="sm:hidden p-4 border-t">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="default" className="text-sm">
              {selectedMail.length} selected
            </Badge>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Selected
            </Button>
            <Button size="sm" variant="primary" onClick={() => onForward()}>
              <Truck className="h-4 w-4 mr-2" />
              Request Forwarding
            </Button>
          </div>
        </div>
      )}
    </>
  );
}


