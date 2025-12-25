'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileText, Truck, X, ArrowLeft } from 'lucide-react';
import type { MailItem } from './types';

type StatusMeta = { label: string; badgeClass: string };

interface MailDetailProps {
  item: MailItem;
  onBack: () => void;
  onView: () => void;
  onDownload: () => void;
  onForward: () => void;
  forwardInlineNotice: string | null;
  onDismissForwardNotice: () => void;
  miniViewerLoading: boolean;
  miniViewerUrl: string | null;
  miniViewerError: string | null;
  mailTypeIcon: (item: MailItem) => React.ComponentType<{ className?: string }>;
  mailStatusMeta: (item: MailItem) => StatusMeta;
  formatTime: (d?: string) => string;
}

export function MailDetail({
  item,
  onBack,
  onView,
  onDownload,
  onForward,
  forwardInlineNotice,
  onDismissForwardNotice,
  miniViewerLoading,
  miniViewerUrl,
  miniViewerError,
  mailTypeIcon,
  mailStatusMeta,
  formatTime,
}: MailDetailProps) {
  const Icon = mailTypeIcon(item);
  const title = item.sender_name || item.tag || 'Mail';
  const subtitle = item.subject || 'Mail item';
  const status = mailStatusMeta(item);

  return (
    <div className="bg-white">
      <div className="px-4 sm:px-6 pt-4 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </button>

        <div className="mt-5 flex items-start gap-4">
          <div className="pt-1">
            <Icon className="h-7 w-7 text-neutral-900" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 truncate">{title}</h2>
              {!item.is_read && <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
            </div>
            <p className="mt-2 text-lg text-neutral-500 truncate">{subtitle}</p>
            <div className="mt-3 flex items-center gap-4">
              <Badge className={`rounded-full px-4 py-1 text-base font-medium ${status.badgeClass}`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200" />

      {/* Actions + preview + details (match screenshot layout) */}
      <div className="px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          {/* Left column: actions then preview */}
          <div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-24 max-w-2xl">
              <button
                type="button"
                onClick={onView}
                className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                <Eye className="h-6 w-6" />
                <span className="text-sm font-medium">View</span>
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                <Download className="h-6 w-6" />
                <span className="text-sm font-medium">Download</span>
              </button>

              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={onForward}
                  className="flex flex-col items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                >
                  <Truck className="h-6 w-6" />
                  <span className="text-sm font-medium">Forward</span>
                </button>

                {forwardInlineNotice && (
                  <div
                    role="alert"
                    className="absolute top-full mt-3 z-20 w-[min(420px,90vw)] rounded-xl border border-neutral-200 bg-white shadow-lg p-4"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-neutral-900">Cannot Forward Mail</div>
                      <button
                        type="button"
                        onClick={onDismissForwardNotice}
                        className="shrink-0 rounded-md p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-neutral-600 leading-relaxed">{forwardInlineNotice}</div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onView}
              className="mt-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 transition-colors min-h-[420px] flex items-center justify-center w-full overflow-hidden relative"
            >
              {/* Mini viewer (real PDF preview) */}
              {miniViewerLoading ? (
                <div className="text-center px-6">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
                  <div className="mt-4 text-base font-medium text-neutral-800">Loading preview…</div>
                  <div className="mt-2 text-sm text-neutral-500">Fetching your scanned document</div>
                </div>
              ) : miniViewerUrl ? (
                <>
                  <object data={miniViewerUrl} type="application/pdf" className="absolute inset-0 w-full h-full pointer-events-none">
                    <iframe
                      title="Mini PDF preview"
                      src={miniViewerUrl}
                      className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                    />
                  </object>
                  {/* soft overlay so it still looks like a preview tile */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/25 pointer-events-none" />
                  <div className="absolute bottom-6 left-0 right-0 text-center px-6 pointer-events-none">
                    <div className="text-base font-medium text-neutral-800">Document preview</div>
                    <div className="mt-1 text-sm text-neutral-500">Tap “View” to open full document</div>
                  </div>
                </>
              ) : (
                <div className="text-center px-6">
                  <FileText className="h-10 w-10 mx-auto text-neutral-500" />
                  <div className="mt-4 text-base font-medium text-neutral-800">Document preview</div>
                  <div className="mt-2 text-sm text-neutral-500">
                    {miniViewerError ? 'Preview unavailable — tap “View” to open full document' : 'Tap “View” to open full document'}
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Right column: details */}
          <div>
            <div className="text-base font-medium text-neutral-900">Details</div>
            <div className="mt-4 space-y-4">
              {[
                { label: 'From', value: item.sender_name || '—' },
                { label: 'Subject', value: item.subject || '—' },
                {
                  label: 'Status',
                  value: (
                    <Badge className={`rounded-full px-4 py-1 text-sm font-medium ${status.badgeClass}`}>{status.label}</Badge>
                  ),
                },
                { label: 'Received', value: formatTime(item.received_date || item.created_at) },
              ].map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-6">
                  <div className="text-base text-neutral-500">{r.label}:</div>
                  <div className="text-base font-medium text-neutral-900 text-right break-words max-w-[70%]">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


