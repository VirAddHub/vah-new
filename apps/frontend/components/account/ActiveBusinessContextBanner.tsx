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
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-2.5 text-sm text-neutral-700">
      <Building2 className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
      <span>
        Viewing: <strong className="font-medium text-neutral-900">{activeBusiness.company_name}</strong>
      </span>
    </div>
  );
}
