'use client';

import React from 'react';
import { FileText, X, ArrowLeft, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MailItem } from './types';

type StatusMeta = { label: string; badgeClass: string };

interface MailDetailProps {
  item: MailItem;
  onBack: () => void;
  onView: () => void;
  onDownload: () => void;
  onForward: () => void;
  onArchive?: () => void;
  forwardInlineNotice: string | null;
  onDismissForwardNotice: () => void;
  miniViewerLoading: boolean;
  miniViewerUrl: string | null;
  miniViewerError: string | null;
  isDownloading?: boolean;
  mailTypeIcon: (item: MailItem) => React.ComponentType<{ className?: string }>;
  mailStatusMeta: (item: MailItem) => StatusMeta;
  formatTime: (d?: string | number) => string;
}

export function MailDetail({
  item,
  onBack,
  onView,
  onDownload,
  onForward,
  onArchive,
  forwardInlineNotice,
  onDismissForwardNotice,
  miniViewerLoading,
  miniViewerUrl,
  miniViewerError,
  isDownloading = false,
  mailTypeIcon,
  mailStatusMeta,
  formatTime,
}: MailDetailProps) {
  const title = item.sender_name || item.subject || item.tag || 'Mail';

  return (
    <div className="bg-background w-full">
      <div className="flex flex-col gap-8">
        {/* Back to Inbox button */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors duration-150 text-sm font-normal w-fit"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to Inbox
        </button>

        {/* Mail title */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 leading-tight">
            {title}
          </h1>
          <p className="text-sm text-neutral-500">
            Received {formatTime(item.created_at)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            onClick={onView}
            className="h-10 px-5 transition-all duration-150"
          >
            View Scan
          </Button>

          <Button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            variant="outline"
            className="h-10 px-5 transition-all duration-150"
          >
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>

          {onArchive && (
            <Button
              type="button"
              onClick={onArchive}
              variant="outline"
              className="h-10 px-5 transition-all duration-150"
            >
              <Archive className="h-4 w-4 mr-2" strokeWidth={2} />
              Archive
            </Button>
          )}

          <div className="relative">
            <Button
              type="button"
              onClick={onForward}
              variant="outline"
              className="h-10 px-5 transition-all duration-150"
            >
              Request Forwarding
            </Button>

            {forwardInlineNotice && (
              <div
                role="alert"
                className="absolute top-full mt-3 z-20 w-[min(420px,90vw)] rounded-xl border border-neutral-200 bg-white shadow-lg p-4 transition-opacity duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-900">Cannot Forward Mail</div>
                  <button
                    type="button"
                    onClick={onDismissForwardNotice}
                    className="shrink-0 rounded-md p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-all duration-150"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-2 text-sm text-neutral-600 leading-relaxed">{forwardInlineNotice}</div>
              </div>
            )}
          </div>
        </div>

        {/* Subtle divider */}
        <div className="border-t border-neutral-200" />

        {/* PDF Viewer - Embedded container */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
          {miniViewerLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
              <p className="mt-6 text-base font-medium text-neutral-900">
                Loading preview…
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Fetching your scanned document
              </p>
            </div>
          ) : miniViewerUrl ? (
            <div className="relative w-full" style={{ minHeight: '600px' }}>
              <object 
                data={miniViewerUrl} 
                type="application/pdf" 
                className="w-full h-full rounded"
                style={{ minHeight: '600px' }}
              >
                <iframe
                  title="Mail Scan Preview"
                  src={miniViewerUrl}
                  className="w-full h-full rounded border-0"
                  style={{ minHeight: '600px' }}
                />
              </object>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-neutral-300" strokeWidth={1.5} />
              <p className="mt-6 text-base font-medium text-neutral-900">
                {miniViewerError ? 'Preview unavailable' : 'No preview available'}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {miniViewerError ? 'Click "View Scan" to open full document' : 'Click "View Scan" to view the document'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


