'use client';

import Link from 'next/link';
import { X, Settings, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MailDetail } from './MailDetail';
import type { MailItem } from './types';

type RightPanelView = 'mail-detail' | 'forwarding' | 'account' | null;

interface RightPanelProps {
  view: RightPanelView;
  onClose: () => void;
  // Mail detail props
  selectedMailDetail?: MailItem | null;
  onMailView?: () => void;
  onMailForward?: () => void;
  forwardInlineNotice?: string | null;
  onDismissForwardNotice?: () => void;
  miniViewerLoading?: boolean;
  miniViewerUrl?: string | null;
  miniViewerError?: string | null;
  mailTypeIcon?: (item: MailItem) => React.ComponentType<{ className?: string }>;
  mailStatusMeta?: (item: MailItem) => { label: string; badgeClass: string };
  formatTime?: (d?: string | number) => string;
  formatDate?: (dateValue: string | number | undefined) => string;
  // Forwarding props
  forwardingRequests?: unknown[];
  onRequestForwarding?: (mailItem: MailItem) => void;
  // Account props
  userProfile?: unknown;
}

export function RightPanel({
  view,
  onClose,
  selectedMailDetail,
  onMailView,
  onMailForward,
  forwardInlineNotice,
  onDismissForwardNotice,
  miniViewerLoading,
  miniViewerUrl,
  miniViewerError,
  mailTypeIcon,
  mailStatusMeta,
  formatTime,
  formatDate,
  forwardingRequests = [],
  onRequestForwarding,
  userProfile,
}: RightPanelProps) {
  if (!view) return null;

  return (
    <div className="fixed inset-0 z-50 lg:static lg:z-auto">
      {/* Mobile overlay */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl lg:static lg:h-auto lg:max-w-none bg-background shadow-xl lg:shadow-none border-l border-border overflow-y-auto">
        <Card className="h-full lg:h-auto border-0 lg:border rounded-lg">
          <CardHeader className="sticky top-0 bg-background z-10 border-b flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold">
              {view === 'mail-detail' && 'Mail Details'}
              {view === 'forwarding' && 'Forwarding Requests'}
              {view === 'account' && 'Account'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            {view === 'mail-detail' && selectedMailDetail && (
              <div className="p-6 lg:p-8">
                <MailDetail
                  item={selectedMailDetail}
                  onBack={onClose}
                  onView={onMailView || (() => {})}
                  onForward={onMailForward || (() => {})}
                  forwardInlineNotice={forwardInlineNotice || null}
                  onDismissForwardNotice={onDismissForwardNotice || (() => {})}
                  miniViewerLoading={miniViewerLoading || false}
                  miniViewerUrl={miniViewerUrl || null}
                  miniViewerError={miniViewerError || null}
                  mailTypeIcon={mailTypeIcon || (() => () => null)}
                  mailStatusMeta={mailStatusMeta || (() => ({ label: '', badgeClass: '' }))}
                  formatTime={formatTime || (() => '—')}
                  formatDate={formatDate || (() => '')}
                />
              </div>
            )}
            
            {view === 'forwarding' && (
              <ForwardingView
                forwardingRequests={forwardingRequests}
                onRequestForwarding={onRequestForwarding}
              />
            )}
            
            {view === 'account' && (
              <AccountView userProfile={userProfile} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ForwardingView({ 
  forwardingRequests, 
  onRequestForwarding 
}: { 
  forwardingRequests: unknown[];
  onRequestForwarding?: (mailItem: MailItem) => void;
}) {
  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('requested')) return 'bg-warning/10 text-warning-foreground';
    if (normalized.includes('reviewed') || normalized.includes('processing')) return 'bg-primary/10 text-primary-foreground';
    if (normalized.includes('dispatched')) return 'bg-warning/10 text-warning-foreground';
    if (normalized.includes('delivered')) return 'bg-success/10 text-success-foreground';
    if (normalized.includes('cancelled')) return 'bg-destructive/10 text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDestination = (request: Record<string, unknown>) => {
    const parts = [request.city, request.postal, request.country].filter(Boolean) as string[];
    return parts.join(', ');
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="space-y-4">
        {forwardingRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-medium mb-2">No forwarding requests yet</p>
            <p className="text-sm text-muted-foreground">
              Select a mail item and click "Forward" to create a forwarding request.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forwardingRequests.map((request) => {
              const r = request as Record<string, unknown>;
              return (
              <Card key={String(r.id)} className="border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-base">Request #{String(r.id)}</h3>
                      <Badge className={getStatusColor(String(r.status ?? ''))}>
                        {String(r.status ?? '')}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">To:</span> {String(r.to_name ?? '')}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Destination:</span> {formatDestination(r)}
                      </p>
                      {r.tracking_number != null && (
                        <p>
                          <span className="font-medium text-foreground">Tracking:</span> {String(r.tracking_number)}
                        </p>
                      )}
                      {r.courier != null && (
                        <p>
                          <span className="font-medium text-foreground">Courier:</span> {String(r.courier)}
                        </p>
                      )}
                      <p className="text-xs mt-2">
                        Requested: {formatDate(Number(r.created_at))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountView({ userProfile }: { userProfile?: unknown }) {
  const p = userProfile as Record<string, unknown> | null | undefined;
  return (
    <div className="p-4 lg:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Account Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Email:</span> {(p?.email as string) || '—'}</p>
            <p><span className="font-medium">Name:</span> {p?.first_name as string} {p?.last_name as string}</p>
            {(p?.company_name != null) && (
              <p><span className="font-medium">Company:</span> {String(p.company_name)}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To update your details, use the links below:
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/account/settings"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Edit profile &amp; phone (Settings)
            </Link>
            <Link
              href="/account/addresses"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Edit forwarding address (Addresses)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
