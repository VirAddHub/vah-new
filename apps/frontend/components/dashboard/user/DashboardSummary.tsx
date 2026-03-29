'use client';

import { Users, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IdentityComplianceCard, Compliance } from '@/components/dashboard/IdentityComplianceCard';
import type { DashboardUserProfile } from './types';

interface DashboardSummaryProps {
  userProfile: DashboardUserProfile | null;
  /** When null, verification status is not yet known — do not assume "unverified". */
  compliance: Compliance | null;
  identityReady: boolean;
  onRefreshIdentity?: () => void;
  showIdentitySuccessBanner: boolean;
  onNavigate: (page: string, data?: any) => void;
}

export function DashboardSummary({
  userProfile,
  compliance,
  identityReady,
  onRefreshIdentity,
  showIdentitySuccessBanner,
  onNavigate,
}: DashboardSummaryProps) {
  return (
    <>
      {/* Business Owners Pending Banner */}
      {userProfile?.owners_pending_info === true && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>Business owners required:</strong> You told us there are other directors/owners. Please add them
                to complete verification.
              </div>
              <Button
                size="sm"
                onClick={() => onNavigate('business-owners')}
                className="ml-4 bg-amber-600 hover:bg-amber-700 !text-white [&_svg]:!text-white"
              >
                Add business owners
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!identityReady && userProfile && (
        <div className="order-2 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-full max-w-md rounded bg-muted animate-pulse" />
            </div>
            {onRefreshIdentity && (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onRefreshIdentity}>
                Refresh status
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Identity Compliance Card (desktop) */}
      {identityReady &&
        compliance &&
        (!compliance.canUseRegisteredOfficeAddress || showIdentitySuccessBanner) && (
        <div className="hidden md:block order-2 md:order-1">
          <IdentityComplianceCard compliance={compliance} kycStatus={userProfile?.kyc_status || null} />
        </div>
      )}

      {/* Mobile: compact identity status strip */}
      {identityReady &&
        compliance &&
        (!compliance.canUseRegisteredOfficeAddress || showIdentitySuccessBanner) && (
        <div className="md:hidden order-2 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-body-sm font-semibold text-foreground">
              {compliance.isKycApproved && compliance.isChVerified ? '✔ Identity Verified' : '⏳ Identity check required'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


