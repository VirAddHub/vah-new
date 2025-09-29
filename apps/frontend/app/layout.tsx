// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/use-toast';
import StatusPill from '@/components/StatusPill';
import { AuthProvider } from '@/lib/auth';
import { ReadyPing } from '@/components/ReadyPing';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'VirtualAddressHub',
    description: 'Your professional London business address with secure digital mail.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
                <ReadyPing />
                <AuthProvider>
                    <ToastProvider>
                        {/* Temporarily disabled StatusPill to stop /undefined/api/ready spam */}
                        {/* <div className="fixed top-4 right-4 z-50">
                            <StatusPill />
                        </div> */}
                        {children}
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}