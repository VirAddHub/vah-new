'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, HelpCircle, ArrowRight } from 'lucide-react';

const SUPPORT_EMAIL = 'support@virtualaddresshub.co.uk';

/** Full-width CTA on mobile; fixed column on sm+ (aligned with other cards). */
const CTA_COL =
  'w-full border-t border-border/60 pt-3 sm:w-[11rem] sm:shrink-0 sm:border-t-0 sm:pt-0';
const CTA_BTN =
  'h-11 min-h-[44px] w-full px-4 text-body-sm font-medium shadow-none transition-[box-shadow,transform] duration-200 sm:hover:-translate-y-px active:scale-[0.99] sm:active:scale-100';

function getWhatsappChatUrl(): string | null {
  const direct = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  if (direct) return direct;
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_E164?.replace(/\D/g, '');
  if (raw && raw.length >= 10) return `https://wa.me/${raw}`;
  return null;
}

function SupportCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-xl border border-border bg-muted/45 px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,background-color] duration-200 sm:px-5 sm:hover:border-foreground/[0.12] sm:hover:bg-muted/55 sm:hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/90 text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.85)] sm:h-9 sm:w-9">
      {children}
    </div>
  );
}

export default function AccountSupportPage() {
  const whatsappUrl = getWhatsappChatUrl();
  const mailtoSupport = `mailto:${SUPPORT_EMAIL}`;
  const mailtoWhatsappRequest = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('WhatsApp support')}&body=${encodeURIComponent('Please send me your WhatsApp Business contact.\n')}`;

  return (
    <div className="w-full">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-[1.875rem] font-semibold leading-snug tracking-tight text-foreground">
          Support
        </h1>
        <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-foreground/80">
          Get help with your account, billing, verification, or mail through the channel that suits you best.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {/* Email */}
        <SupportCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex min-w-0 gap-3 sm:gap-3.5">
              <IconBadge>
                <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </IconBadge>
              <div className="min-w-0 space-y-1">
                <h2 className="text-body font-semibold text-foreground sm:text-[0.9375rem]">
                  Email support
                </h2>
                <p className="text-body-sm leading-snug text-foreground/[0.82]">
                  Best for account questions, billing, and verification help.
                </p>
                <p className="pt-0.5 font-mono text-[0.8125rem] leading-snug text-foreground/90 sm:text-body-sm">
                  {SUPPORT_EMAIL}
                </p>
                <p className="text-caption leading-snug text-muted-foreground">
                  Typical response time: within 24 hours on working days.
                </p>
              </div>
            </div>
            <div className={CTA_COL}>
              <Button
                type="button"
                className={`${CTA_BTN} bg-primary text-primary-foreground hover:bg-primary/92`}
                onClick={() => {
                  window.location.href = mailtoSupport;
                }}
              >
                Send email
                <ArrowRight className="ml-2 h-4 w-4 opacity-90" aria-hidden />
              </Button>
            </div>
          </div>
        </SupportCard>

        {/* WhatsApp */}
        <SupportCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex min-w-0 gap-3 sm:gap-3.5">
              <IconBadge>
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </IconBadge>
              <div className="min-w-0 space-y-1">
                <h2 className="text-[0.9375rem] font-semibold leading-snug text-foreground">
                  WhatsApp
                </h2>
                <p className="text-body-sm leading-snug text-foreground/[0.82]">
                  Best for quick questions and simple support requests.
                </p>
                <p className="text-caption leading-snug text-muted-foreground">
                  Mon–Fri, 8:00 AM–6:00 PM
                </p>
              </div>
            </div>
            <div className={CTA_COL}>
              <Button
                type="button"
                className={`${CTA_BTN} bg-primary text-primary-foreground hover:bg-primary/92`}
                onClick={() => {
                  if (whatsappUrl) {
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    window.location.href = mailtoWhatsappRequest;
                  }
                }}
              >
                {whatsappUrl ? 'Chat on WhatsApp' : 'Request WhatsApp'}
                <ArrowRight className="ml-2 h-4 w-4 opacity-90" aria-hidden />
              </Button>
            </div>
          </div>
        </SupportCard>

        {/* Help Centre — secondary */}
        <SupportCard className="bg-muted/35 sm:hover:bg-muted/45">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex min-w-0 gap-3 sm:gap-3.5">
              <IconBadge>
                <HelpCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </IconBadge>
              <div className="min-w-0 space-y-1">
                <h2 className="text-[0.9375rem] font-semibold leading-snug text-foreground/95">
                  Help Centre
                </h2>
                <p className="text-body-sm leading-snug text-foreground/[0.78]">
                  Browse answers to common questions about billing, mail, verification, and your account.
                </p>
              </div>
            </div>
            <div className={CTA_COL}>
              <Button
                type="button"
                variant="outline"
                className={`${CTA_BTN} border-border bg-background/90 font-medium text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-foreground/15 hover:bg-muted/40 hover:text-foreground`}
                onClick={() => {
                  window.open('/help', '_blank', 'noopener,noreferrer');
                }}
              >
                Open Help Centre
                <ArrowRight className="ml-2 h-4 w-4 opacity-70" aria-hidden />
              </Button>
            </div>
          </div>
        </SupportCard>
      </div>
    </div>
  );
}
