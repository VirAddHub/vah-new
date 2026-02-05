'use client';

import { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { HomePage } from './HomePage';
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
import { ProfilePage } from './ProfilePage';
import dynamic from 'next/dynamic';
import { FontLoader } from './FontLoader';

// Lazy load AccountPage to avoid circular dependencies
const AccountPage = dynamic(() => import('../app/(dashboard)/account/page'), { ssr: false });
import { MarketingNavigation } from './MarketingNavigation';
import { Footer } from './Footer';
import { ThemeProvider } from "./ui/theme";
import { SchemaInjection, SchemaMarkup } from "./seo/SchemaMarkup";
import { parseBlogHash } from "@/lib/hash-parser";

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

  // Figma landing page uses Poppins
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
    link.as = 'style';
    link.onload = function () {
      (this as any).rel = 'stylesheet';
    };
    document.head.appendChild(link);
  }, []);

  // Redirect to actual Next.js login route when navigating to 'login'
  useEffect(() => {
    if (currentPage === 'login') {
      window.location.href = '/login';
    }
  }, [currentPage]);

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
      case 'blog':
        return <BlogPage onNavigate={navigate} />;
      case 'blog-post':
        // Extract slug from URL hash if available
        const hash = window.location.hash;
        const blogHashData = parseBlogHash(hash);
        return (
          <BlogPostPage
            slug={blogHashData?.slug || 'default-slug'}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      case 'pricing':
        return <PlansPage onNavigate={handleNavigate} />;
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
        // Redirect handled by useEffect above
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Redirecting to login...</p>
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      case 'billing':
        return <BillingDashboard onNavigate={navigate} />;
      case 'account':
        return <AccountPage />;
      case 'kyc':
        return <KYCDashboard onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} onGoBack={goBack} />;
      case 'settings':
        return <ProfilePage onNavigate={navigate} onGoBack={goBack} />;
      case 'admin':
        // Placeholder for admin page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Admin Portal</h1>
              <p className="text-muted-foreground mb-4">Admin functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
    }
  };

  // Check if current page is a dashboard page
  // Note: 'kyc' and 'kyc-policy' both render KYCPolicyPage (legal/compliance), not dashboard
  const isDashboardPage = ['dashboard', 'billing', 'account', 'profile', 'settings', 'admin'].includes(currentPage);

  return (
    <ThemeProvider>
      {/* SEO Schema Markup */}
      <SchemaInjection schema={SchemaMarkup.organization} />
      <SchemaInjection schema={SchemaMarkup.service} />

      {/* Font Loading */}
      <FontLoader />

      <div className="min-h-screen flex flex-col">
        <MarketingNavigation onNavigate={navigate} />
        <main className="flex-1">
          {renderPage()}
        </main>
        {!isDashboardPage && <Footer onNavigate={navigate} />}
      </div>
    </ThemeProvider>
  );
}
