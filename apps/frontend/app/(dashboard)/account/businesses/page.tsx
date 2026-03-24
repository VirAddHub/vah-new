'use client';

import { BusinessesSection } from '@/components/account/BusinessesSection';

export default function AccountBusinessesPage() {
  return (
    <div className="w-full">
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-h3 sm:text-h2 lg:text-h1 font-semibold text-foreground mb-1.5 sm:mb-2 leading-tight tracking-tight">
          Business
        </h1>
        <p className="text-body-sm sm:text-body text-muted-foreground leading-relaxed">
          View and manage your business details for this account.
        </p>
      </div>
      <BusinessesSection />
    </div>
  );
}
