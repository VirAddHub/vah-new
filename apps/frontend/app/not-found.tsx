'use client';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { NotFoundPage } from '@/components/NotFoundPage';
import { MarketingNavigation } from '@/components/MarketingNavigation';
import { Footer } from '@/components/Footer';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      router.push('/');
    } else {
      router.push(`/${page}`);
    }
  };

  return (
    <NavigationProvider>
      <div className="min-h-screen flex flex-col">
        <MarketingNavigation onNavigate={handleNavigate} />
        <main className="flex-1">
          <NotFoundPage onNavigate={handleNavigate} />
        </main>
        <Footer onNavigate={handleNavigate} />
      </div>
    </NavigationProvider>
  );
}
