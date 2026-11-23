"use client";
import { useRouter } from 'next/navigation';
import { PlansPage } from '@/components/PlansPage';
import { PricingProvider, type InitialPricing } from '@/contexts/PricingContext';

export default function PricingPageClient({initialPricing}: {initialPricing: InitialPricing | null}) {
  const router = useRouter();
  return <PricingProvider initialPricing={initialPricing}>
    <PlansPage onNavigate={(page, data) => {
      if (page === 'signup') router.push(`/signup${data?.initialBilling ? `?billing=${data.initialBilling}` : ''}`);
    }} />
  </PricingProvider>;
}
