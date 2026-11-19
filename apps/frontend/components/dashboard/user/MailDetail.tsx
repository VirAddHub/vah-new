'use client';

import React, { useState } from 'react';
import { ArrowLeft, Archive, ArchiveRestore, Download, FileText, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusSteps } from '@/components/ui/status-steps';
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
  formatTime: (d?: string | number) => string;
}

export function receivedDate(item: MailItem): string {
  const raw = item.received_at_ms ?? item.received_date ?? item.received_at ?? item.created_at;
  if (raw == null || raw === '') return '—';
  const n = Number(raw);
  const d = Number.isFinite(n) && String(raw).length >= 12 ? new Date(n) : new Date(String(raw));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Where the item is in its life: received, scanned, then forwarding if requested. */
function lifecycle(item: MailItem): { steps: string[]; current: number } {
  const f = String((item.forwarding_status as string) ?? '').toLowerCase();
  const scanned = Boolean(item.scanned_at || item.file_url) || String(item.status ?? '').toLowerCase().includes('scan');
  if (f) {
    const steps = ['Received', 'Forwarding requested', 'In progress', 'Dispatched'];
    const current = /dispatch|deliver|complete|forwarded/.test(f) ? 3 : /process|progress|review/.test(f) ? 2 : 1;
    return { steps, current };
  }
  return { steps: ['Received', 'Scanned'], current: scanned ? 1 : 0 };
}

export function MailDetail({
  item, onBack, onView, onForward, onArchive, onUnarchive, forwardInlineNotice, onDismissForwardNotice,
  miniViewerLoading, miniViewerUrl, miniViewerError,
}: MailDetailProps) {
  const headline = getMailItemPrimaryLabel(item);
  const previewSrc = miniViewerUrl ? pdfEmbedUrl(miniViewerUrl) : null;
  const life = lifecycle(item);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download() {
    setDownloading(true); setDownloadError(null);
    try {
      const res = await fetch(`/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(String(item.id))}`, { credentials: 'include' });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('pdf')) throw new Error('download_failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${headline.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'mail'}-${item.id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setDownloadError('We could not download this scan. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full min-w-0 bg-paper">
      <button type="button" onClick={onBack}
        className="-ml-2 mb-4 inline-flex h-11 items-center gap-2 rounded-full px-2 text-[14px] text-graphite hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to inbox
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        {/* Scan */}
        <section aria-label="Scan" className="order-2 min-w-0 lg:order-1">
          <div className="overflow-hidden rounded-lg border border-line bg-mist">
            {miniViewerLoading ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center py-16 lg:min-h-[min(80dvh,980px)]" role="status">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden />
                <p className="mt-4 text-[14px] text-graphite">Loading the scan…</p>
              </div>
            ) : previewSrc ? (
              <div className="relative h-[min(75dvh,980px)] min-h-[420px] w-full bg-paper">
                {/* iframe, not <object>: the site's CSP blocks plugin content (object-src 'none') */}
                <iframe title="Scan of this letter" src={previewSrc} className="absolute inset-0 h-full w-full border-0" />
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
                <FileText className="h-10 w-10 text-slate" strokeWidth={1.5} aria-hidden />
                <p className="mt-4 text-[15px] font-medium text-ink">{miniViewerError ? 'Preview unavailable' : 'No preview yet'}</p>
                <p className="mt-1 text-[14px] text-graphite">Use “Open scan” or “Download” to see the document.</p>
              </div>
            )}
          </div>
        </section>

        {/* Details and actions */}
        <aside className="order-1 min-w-0 lg:order-2">
          <h1 className="break-words text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">{headline}</h1>
          <dl className="mt-4 divide-y divide-line border-y border-line text-[14px]">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-graphite">Received</dt><dd className="figure-mono text-ink">{receivedDate(item)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-graphite">Reference</dt><dd className="figure-mono text-ink">#{item.id}</dd></div>
            {item.tag && <div className="flex justify-between gap-4 py-2.5"><dt className="text-graphite">Tag</dt><dd className="text-ink">{item.tag}</dd></div>}
            {item.deleted && <div className="flex justify-between gap-4 py-2.5"><dt className="text-graphite">Location</dt><dd className="text-ink">Archived</dd></div>}
          </dl>

          <div className="mt-5">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-slate">Status</p>
            <StatusSteps steps={life.steps} current={life.current} label="Status of this item" orientation="vertical" />
          </div>

          <div className="mt-6 grid gap-2">
            <Button type="button" onClick={download} loading={downloading} fullWidth>
              {!downloading && <Download className="h-4 w-4" aria-hidden />} Download
            </Button>
            <Button type="button" variant="outline" onClick={onView} fullWidth>
              <FileText className="h-4 w-4" aria-hidden /> Open scan
            </Button>
            <Button type="button" variant="outline" onClick={onForward} fullWidth>
              <Send className="h-4 w-4" aria-hidden /> Request forwarding
            </Button>
            {item.deleted && onUnarchive ? (
              <Button type="button" variant="ghost" onClick={onUnarchive} fullWidth>
                <ArchiveRestore className="h-4 w-4" aria-hidden /> Move back to inbox
              </Button>
            ) : !item.deleted && onArchive ? (
              <Button type="button" variant="ghost" onClick={onArchive} fullWidth>
                <Archive className="h-4 w-4" aria-hidden /> Archive
              </Button>
            ) : null}
          </div>

          {downloadError && <p role="alert" className="mt-3 text-[14px] text-destructive">{downloadError}</p>}
          {forwardInlineNotice && (
            <div role="alert" className="mt-4 rounded-md border border-line bg-mist p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-medium text-ink">Cannot forward this item</p>
                <button type="button" onClick={onDismissForwardNotice} aria-label="Dismiss"
                  className="-m-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-graphite hover:bg-paper hover:text-ink">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-[14px] text-graphite">{forwardInlineNotice}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
