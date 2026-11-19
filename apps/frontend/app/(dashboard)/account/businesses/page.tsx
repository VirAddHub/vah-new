'use client';

import { BusinessesSection } from '@/components/account/BusinessesSection';

export default function AccountBusinessesPage() {
  return (
    <div className="w-full">
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="page-title">
          Business
        </h1>
        <p className="page-lede">
          View and manage your business details for this account.
        </p>
      </div>
      <BusinessesSection />
    </div>
  );
}
