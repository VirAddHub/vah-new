'use client';

import { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import dynamic from 'next/dynamic';
import { Navigation } from './Navigation';
import { Footer } from './Footer';

// Dynamic imports for heavy components
const HomePage = dynamic(() => import('./HomePage').then(mod => ({ default: mod.HomePage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const AboutPage = dynamic(() => import('./AboutPage').then(mod => ({ default: mod.AboutPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const BlogPage = dynamic(() => import('./BlogPage').then(mod => ({ default: mod.BlogPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const BlogPostPage = dynamic(() => import('./BlogPostPage').then(mod => ({ default: mod.BlogPostPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const PlansPage = dynamic(() => import('./PlansPage').then(mod => ({ default: mod.PlansPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const TermsPage = dynamic(() => import('./TermsPage').then(mod => ({ default: mod.TermsPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const PrivacyPolicyPage = dynamic(() => import('./PrivacyPolicyPage').then(mod => ({ default: mod.PrivacyPolicyPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const KYCPolicyPage = dynamic(() => import('./KYCPolicyPage').then(mod => ({ default: mod.KYCPolicyPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const HelpPage = dynamic(() => import('./HelpPage').then(mod => ({ default: mod.HelpPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const ContactPage = dynamic(() => import('./ContactPage'), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const SignupPage = dynamic(() => import('./SignupPage').then(mod => ({ default: mod.SignupPage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const BillingDashboard = dynamic(() => import('./BillingDashboard').then(mod => ({ default: mod.BillingDashboard })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const KYCDashboard = dynamic(() => import('./KYCDashboard').then(mod => ({ default: mod.KYCDashboard })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const ProfilePage = dynamic(() => import('./ProfilePage').then(mod => ({ default: mod.ProfilePage })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

const AccountPage = dynamic(() => import('../app/(dashboard)/account/page'), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

export function App() {
  const { currentPage, navigate, goBack } = useNavigation();
  const [signupData, setSignupData] = useState<any>(null);

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
        // Placeholder for login page
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Login Page</h1>
              <p className="text-muted-foreground mb-4">Login functionality coming soon</p>
              <button
                onClick={() => navigate('home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
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
