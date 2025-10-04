'use client';

import { useState, useEffect } from 'react';
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
import ContactPage from './ContactPage';
import { SignupPage } from './SignupPage';
import { BillingDashboard } from './BillingDashboard';
import { KYCDashboard } from './KYCDashboard';
import { FontLoader } from './FontLoader';
import { Navigation } from './Navigation';
import { Footer } from './Footer';

export function App() {
  const { currentPage, navigate, goBack } = useNavigation();
  const [signupData, setSignupData] = useState<any>(null);

  // Layer 2: HTML Preload for Montserrat fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
    link.as = 'style';
    link.onload = function () {
      (this as any).rel = 'stylesheet';
    };
    document.head.appendChild(link);
  }, []);

  const handleNavigate = (page: string, data?: any) => {
    if (page === 'signup' && data) {
      setSignupData(data);
    }
    navigate(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'about':
        return <AboutPage />;
      case 'blog':
        return <BlogPage onNavigate={navigate} />;
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
      case 'contact':
        return <ContactPage onNavigate={navigate} />;
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
        return <SignupPage onNavigate={navigate} initialBilling={signupData?.initialBilling} />;
      case 'dashboard':
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
              <p className="text-muted-foreground mb-4">User dashboard coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      case 'billing':
        return <BillingDashboard onNavigate={navigate} />;
      case 'kyc':
        return <KYCDashboard onNavigate={navigate} />;
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
      <FontLoader />
      <Navigation onNavigate={navigate} />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}
