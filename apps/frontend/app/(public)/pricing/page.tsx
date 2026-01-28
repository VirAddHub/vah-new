'use client';

// Force dynamic rendering (this page passes function props)
export const dynamic = 'force-dynamic';

import { PlansPage } from '@/components/PlansPage';
import { useRouter } from 'next/navigation';

/**
 * Pricing Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 * Layout provides: HeaderWithNav, main wrapper, FooterWithNav
 */
export default function PricingPage() {
  const router = useRouter();
  
  return (
    <PlansPage onNavigate={(page: string, data?: any) => {
      if (page === 'signup') {
        router.push(`/signup${data?.initialBilling ? `?billing=${data.initialBilling}` : ''}`);
      }
    }} />
  );
}