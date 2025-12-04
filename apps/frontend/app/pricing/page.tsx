'use client';

import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { PlansPage } from '@/components/PlansPage';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full bg-background">
        <PlansPage onNavigate={(page: string, data?: any) => {
          if (page === 'signup') {
            router.push(`/signup${data?.initialBilling ? `?billing=${data.initialBilling}` : ''}`);
          }
        }} />
      </main>
      <FooterWithNav />
    </div>
  )
}