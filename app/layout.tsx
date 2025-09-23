import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { DevButtons } from '@/app/components/DevButtons';

export const metadata = {
  title: 'VirtualAddressHub - Professional Mail Management',
  description: 'Your Official London Business Address: Secure, Compliant, and Simple. Professional mail management for UK businesses.',
  keywords: 'virtual address, mail forwarding, digital mailroom, UK address, mail scanning, London business address',
  openGraph: {
    title: 'VirtualAddressHub - Professional Mail Management',
    description: 'Your Official London Business Address: Secure, Compliant, and Simple.',
    type: 'website',
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
            <DevButtons />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
