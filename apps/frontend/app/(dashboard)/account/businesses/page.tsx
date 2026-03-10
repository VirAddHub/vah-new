'use client';

import { BusinessesSection } from '@/components/account/BusinessesSection';
import { ActiveBusinessContextBanner } from '@/components/account/ActiveBusinessContextBanner';

export default function AccountBusinessesPage() {
  return (
    <div className="w-full">
      <ActiveBusinessContextBanner />
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-900 mb-1.5 sm:mb-2 leading-tight tracking-tight">
          Businesses
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
          Manage your businesses and add more under this account
        </p>
      </div>
      <BusinessesSection />
    </div>
  );
}
