'use client';

import { BusinessesSection } from '@/components/account/BusinessesSection';

export default function AccountBusinessesPage() {
  return (
    <div className="w-full">
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 mb-1.5 sm:mb-2 leading-tight tracking-tight">
          Business
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
          View and manage your business details for this account.
        </p>
      </div>
      <BusinessesSection />
    </div>
  );
}
