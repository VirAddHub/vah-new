'use client';

import React from 'react';
import { Download, FileText, Truck, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  formatTime: (d?: string | number) => string;
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
  const title = item.sender_name || item.tag || 'Mail';
  const subtitle = item.subject || 'Mail item';
  
  // Format date for display
  const formatScannedDate = () => {
    const dateToUse = item.scanned_at || item.created_at || item.received_date;
    if (!dateToUse) return null;
    const date = typeof dateToUse === 'number' ? new Date(dateToUse) : new Date(dateToUse);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const displayDate = formatScannedDate() || formatTime(item.received_date || item.created_at);

  return (
    <div className="bg-white w-full">
      <div className="flex flex-col gap-[30px]">
        {/* Back to Inbox button */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#4A5565] hover:text-[#101828] transition-colors text-sm font-normal"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </button>

        {/* Main content */}
        <div className="flex flex-col gap-10">
          {/* Title and date section */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 
                className="text-2xl font-semibold text-[#101828]"
                style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
              >
                {title}
              </h2>
              <p 
                className="text-base text-[#666666]"
                style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
              >
                {displayDate}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-[10px] flex-wrap">
              <Button
                type="button"
                onClick={onView}
                variant="outline"
                className="h-12 px-[10px] rounded-[30px] border-[#40C46C] bg-white text-[#161B1A] hover:bg-[#40C46C]/10 font-medium text-base"
                style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.2' }}
              >
                View Scan
              </Button>
              
              <Button
                type="button"
                onClick={onDownload}
                variant="outline"
                className="h-12 px-[10px] rounded-[30px] border-[#40C46C] bg-white text-[#161B1A] hover:bg-[#40C46C]/10 font-medium text-base"
                style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.2' }}
              >
                Download PDF
              </Button>
              
              <div className="relative">
                <Button
                  type="button"
                  onClick={onForward}
                  variant="outline"
                  className="h-12 px-[10px] rounded-[30px] border-[#40C46C] bg-white text-[#161B1A] hover:bg-[#40C46C]/10 font-medium text-base"
                  style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.2' }}
                >
                  Request Forwarding
                </Button>

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
          </div>

          {/* Preview area */}
          <button
            type="button"
            onClick={onView}
            className="rounded-[30px] bg-[#F9F9F9] min-h-[596px] flex flex-col items-center justify-center p-8 relative overflow-hidden hover:bg-[#F0F0F0] transition-colors cursor-pointer"
          >
            {miniViewerLoading ? (
              <div className="text-center px-6">
                <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
                <div 
                  className="mt-4 text-base font-medium text-[#161B1A]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Loading preview…
                </div>
                <div 
                  className="mt-2 text-sm text-[#666666]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Fetching your scanned document
                </div>
              </div>
            ) : miniViewerUrl ? (
              <>
                {/* PDF Preview */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <object 
                    data={miniViewerUrl} 
                    type="application/pdf" 
                    className="w-full h-full pointer-events-none"
                  >
                    <iframe
                      title="Mail Scan Preview"
                      src={miniViewerUrl}
                      className="w-full h-full border-0 pointer-events-none"
                    />
                  </object>
                </div>
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F9F9F9]/80 pointer-events-none" />
                {/* Text overlay */}
                <div className="relative z-10 flex flex-col gap-[9px] items-center pointer-events-none mt-auto mb-8">
                  <h3 
                    className="text-2xl font-semibold text-[#161B1A] text-center"
                    style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
                  >
                    Mail Scan Preview
                  </h3>
                  <p 
                    className="text-lg text-[#666666] text-center"
                    style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
                  >
                    {subtitle}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center px-6">
                <FileText className="h-10 w-10 mx-auto text-[#666666]" />
                <div 
                  className="mt-4 text-2xl font-semibold text-[#161B1A]"
                  style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
                >
                  Mail Scan Preview
                </div>
                <div 
                  className="mt-2 text-lg text-[#666666]"
                  style={{ fontFamily: 'Poppins, sans-serif', lineHeight: '1.4' }}
                >
                  {miniViewerError ? 'Preview unavailable — click "View Scan" to open full document' : subtitle}
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


