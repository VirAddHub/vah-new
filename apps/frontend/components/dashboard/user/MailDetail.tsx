'use client';

import React from 'react';
import { FileText, X, ArrowLeft, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pdfEmbedUrl } from '@/lib/pdfEmbedUrl';
import { getMailItemPrimaryLabel } from '@/lib/mailItemDates';
import type { MailItem } from './types';

type StatusMeta = { label: string; badgeClass: string };

interface MailDetailProps {
  item: MailItem;
  onBack: () => void;
  onView: () => void;
  onForward: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  forwardInlineNotice: string | null;
  onDismissForwardNotice: () => void;
  miniViewerLoading: boolean;
  miniViewerUrl: string | null;
  miniViewerError: string | null;
  mailTypeIcon: (item: MailItem) => React.ComponentType<{ className?: string }>;
  mailStatusMeta: (item: MailItem) => StatusMeta;
  /** Kept for call-site compatibility */
  formatTime: (d?: string | number) => string;
}

export function MailDetail({
  item,
  onBack,
  onView,
  onForward,
  onArchive,
  onUnarchive,
  forwardInlineNotice,
  onDismissForwardNotice,
  miniViewerLoading,
  miniViewerUrl,
  miniViewerError,
  mailTypeIcon: _mailTypeIcon,
  mailStatusMeta: _mailStatusMeta,
  formatTime: _formatTime,
}: MailDetailProps) {
  void _mailTypeIcon;
  void _mailStatusMeta;
  void _formatTime;

  const headline = getMailItemPrimaryLabel(item);
  const previewSrc = miniViewerUrl ? pdfEmbedUrl(miniViewerUrl) : null;

  return (
    <div className="bg-background w-full min-w-0">
      <div className="flex flex-col gap-5 md:gap-8">
        {/* Back to Inbox - touch-friendly on mobile */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-150 text-body-sm font-normal w-fit min-h-[44px] py-2 -ml-1 pr-2 rounded-lg touch-manipulation -mb-1"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
          Back to Inbox
        </button>

        <h1 className="text-h3 md:text-h2 font-semibold text-foreground leading-tight break-words">
          {headline}
        </h1>

        {/* Action buttons - stack on mobile, comfortable height */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
          <Button
            type="button"
            onClick={onView}
            className="h-11 sm:h-10 px-5 transition-all duration-150 w-full sm:w-auto sm:flex-none touch-manipulation"
          >
            View Scan
          </Button>

          {item.deleted && onUnarchive ? (
            <Button
              type="button"
              onClick={onUnarchive}
              variant="outline"
              className="h-11 sm:h-10 px-5 transition-all duration-150 w-full sm:w-auto sm:flex-none touch-manipulation"
            >
              <ArchiveRestore className="h-4 w-4 mr-2" strokeWidth={2} />
              Unarchive
            </Button>
          ) : !item.deleted && onArchive ? (
            <Button
              type="button"
              onClick={onArchive}
              variant="outline"
              className="h-11 sm:h-10 px-5 transition-all duration-150 w-full sm:w-auto sm:flex-none touch-manipulation"
            >
              <Archive className="h-4 w-4 mr-2" strokeWidth={2} />
              Archive
            </Button>
          ) : null}

          <div className="relative w-full min-w-0 sm:w-auto sm:flex-none">
            <Button
              type="button"
              onClick={onForward}
              variant="outline"
              className="h-11 sm:h-10 px-5 transition-all duration-150 w-full sm:w-auto touch-manipulation"
            >
              Request Forwarding
            </Button>

            {forwardInlineNotice && (
              <div
                role="alert"
                className="absolute top-full left-0 right-0 sm:left-auto sm:right-auto sm:w-[min(420px,90vw)] mt-3 z-20 rounded-xl border border-border bg-card shadow-lg p-4 transition-opacity duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-body-sm font-semibold text-foreground">Cannot Forward Mail</div>
                  <button
                    type="button"
                    onClick={onDismissForwardNotice}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-2 text-body-sm text-muted-foreground leading-relaxed">{forwardInlineNotice}</div>
              </div>
            )}
          </div>
        </div>

        {/* PDF viewer: bleed to screen edges on small viewports; FitH fragment + overflow-x for stubborn viewers */}
        <div className="min-w-0 -mx-4 w-[calc(100%+2rem)] max-w-[100vw] border-y border-border bg-muted/50 py-4 sm:mx-0 sm:w-full sm:max-w-none sm:rounded-xl sm:border sm:px-4 md:p-6 md:rounded-lg">
          {miniViewerLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[min(82dvh,1040px)] py-12 md:py-16">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
              <p className="mt-6 text-body font-medium text-foreground">
                Loading preview…
              </p>
              <p className="mt-2 text-body-sm text-muted-foreground">
                Fetching your scanned document
              </p>
            </div>
          ) : previewSrc ? (
            <div
              className="relative mx-auto w-full min-h-[560px] h-[min(82dvh,1040px)] overflow-x-auto overflow-y-hidden rounded-none bg-background sm:rounded-md [-webkit-overflow-scrolling:touch]"
            >
              <object
                data={previewSrc}
                type="application/pdf"
                className="absolute inset-0 h-full w-full min-h-[560px] rounded-none sm:rounded-md"
                aria-label="Mail scan PDF preview"
              >
                <iframe
                  title="Mail Scan Preview"
                  src={previewSrc}
                  className="absolute inset-0 h-full w-full min-h-[560px] rounded-none border-0 sm:rounded-md"
                />
              </object>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[min(82dvh,1040px)] py-12 md:py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-6 text-body font-medium text-foreground">
                {miniViewerError ? 'Preview unavailable' : 'No preview available'}
              </p>
              <p className="mt-2 text-body-sm text-muted-foreground">
                {miniViewerError ? 'Click "View Scan" to open full document' : 'Click "View Scan" to view the document'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


