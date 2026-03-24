'use client';

import { useActiveBusiness } from '@/contexts/ActiveBusinessContext';
import { Building2 } from 'lucide-react';

/**
 * Shows which business context the user is viewing.
 * Use on overview, verification, addresses, billing so the Active business switcher feels consistent.
 * Hidden when there is only one business to avoid noise.
 */
export function ActiveBusinessContextBanner() {
  const { businesses, activeBusiness } = useActiveBusiness();

  if (businesses.length <= 1 || !activeBusiness) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50/80 px-3 sm:px-4 py-2.5 text-body-sm text-foreground min-w-0 overflow-hidden">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <span className="min-w-0 flex items-center gap-1 overflow-hidden">
        <span className="shrink-0">Viewing:</span>
        <strong className="font-medium text-foreground truncate">{activeBusiness.company_name}</strong>
      </span>
    </div>
  );
}
