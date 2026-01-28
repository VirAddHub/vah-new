'use client';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Navigation } from '@/components/Navigation';
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
        <Navigation onNavigate={handleNavigate} />
        <main className="flex-1">
          <NotFoundPage onNavigate={handleNavigate} />
        </main>
        <Footer onNavigate={handleNavigate} />
      </div>
    </NavigationProvider>
  );
}
