'use client';

import { X } from 'lucide-react';
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
  onMailDownload?: () => void;
  onMailForward?: () => void;
  forwardInlineNotice?: string | null;
  onDismissForwardNotice?: () => void;
  miniViewerLoading?: boolean;
  miniViewerUrl?: string | null;
  miniViewerError?: string | null;
  mailTypeIcon?: (item: MailItem) => React.ComponentType<{ className?: string }>;
  mailStatusMeta?: (item: MailItem) => { label: string; badgeClass: string };
  formatTime?: (d?: string | number) => string;
  // Forwarding props
  forwardingRequests?: any[];
  onRequestForwarding?: (mailItem: MailItem) => void;
  // Account props
  userProfile?: any;
}

export function RightPanel({
  view,
  onClose,
  selectedMailDetail,
  onMailView,
  onMailDownload,
  onMailForward,
  forwardInlineNotice,
  onDismissForwardNotice,
  miniViewerLoading,
  miniViewerUrl,
  miniViewerError,
  mailTypeIcon,
  mailStatusMeta,
  formatTime,
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
              <div className="p-4 lg:p-6">
                <MailDetail
                  item={selectedMailDetail}
                  onBack={onClose}
                  onView={onMailView || (() => {})}
                  onDownload={onMailDownload || (() => {})}
                  onForward={onMailForward || (() => {})}
                  forwardInlineNotice={forwardInlineNotice || null}
                  onDismissForwardNotice={onDismissForwardNotice || (() => {})}
                  miniViewerLoading={miniViewerLoading || false}
                  miniViewerUrl={miniViewerUrl || null}
                  miniViewerError={miniViewerError || null}
                  mailTypeIcon={mailTypeIcon || (() => () => null)}
                  mailStatusMeta={mailStatusMeta || (() => ({ label: '', badgeClass: '' }))}
                  formatTime={formatTime || (() => '—')}
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
  forwardingRequests: any[];
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

  const formatDestination = (request: any) => {
    const parts = [request.city, request.postal, request.country].filter(Boolean);
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
            {forwardingRequests.map((request) => (
              <Card key={request.id} className="border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-base">Request #{request.id}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">To:</span> {request.to_name}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Destination:</span> {formatDestination(request)}
                      </p>
                      {request.tracking_number && (
                        <p>
                          <span className="font-medium text-foreground">Tracking:</span> {request.tracking_number}
                        </p>
                      )}
                      {request.courier && (
                        <p>
                          <span className="font-medium text-foreground">Courier:</span> {request.courier}
                        </p>
                      )}
                      <p className="text-xs mt-2">
                        Requested: {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountView({ userProfile }: { userProfile?: any }) {
  return (
    <div className="p-4 lg:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Account Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Email:</span> {userProfile?.email || '—'}</p>
            <p><span className="font-medium">Name:</span> {userProfile?.first_name} {userProfile?.last_name}</p>
            {userProfile?.company_name && (
              <p><span className="font-medium">Company:</span> {userProfile.company_name}</p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          For full account management, please visit the Account page.
        </p>
      </div>
    </div>
  );
}
