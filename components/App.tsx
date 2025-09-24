"use client";

import { useNavigation } from '@/contexts/NavigationContext';
import { HomePage } from './HomePage';
import { AboutPage } from './AboutPage';
import { BlogPage } from './BlogPage';
import { BlogPostPage } from './BlogPostPage';
import { PlansPage } from './PlansPage';
import { TermsPage } from './TermsPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { KYCPolicyPage } from './KYCPolicyPage';
import { HelpPage } from './HelpPage';
import { Navigation } from './Navigation';
import { Footer } from './Footer';

export function App() {
  const { currentPage, navigate, goBack } = useNavigation();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'about':
        return <AboutPage />;
      case 'blog':
        return <BlogPage />;
      case 'blog-post':
        // Extract slug from URL hash if available
        const hash = window.location.hash.slice(1);
        const [, dataString] = hash.split('-');
        const data = dataString ? JSON.parse(dataString) : {};
        return (
          <BlogPostPage
            slug={data.slug || 'default-slug'}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      case 'pricing':
        return <PlansPage onNavigate={navigate} />;
      case 'terms':
        return <TermsPage onNavigate={navigate} />;
      case 'privacy':
        return <PrivacyPolicyPage onNavigate={navigate} />;
      case 'kyc':
      case 'kyc-policy':
        return <KYCPolicyPage onNavigate={navigate} />;
      case 'help':
        return <HelpPage onNavigate={navigate} onGoBack={goBack} />;
      case 'login':
        // Placeholder for login page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Login Page</h1>
              <p className="text-muted-foreground mb-4">Login functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      case 'signup':
        // Placeholder for signup page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
              <p className="text-muted-foreground mb-4">Sign up functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      case 'dashboard':
        // Placeholder for dashboard page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
              <p className="text-muted-foreground mb-4">Dashboard functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      case 'admin':
        // Placeholder for admin page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Admin Portal</h1>
              <p className="text-muted-foreground mb-4">Admin functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              <p className="text-muted-foreground mb-4">The page "{currentPage}" doesn't exist</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation onNavigate={navigate} />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}
