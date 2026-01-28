import { NavigationProvider } from '@/contexts/NavigationContext';
import { NotFoundPage } from '@/components/NotFoundPage';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  const handleNavigate = (page: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${page === 'home' ? '' : page}`;
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
