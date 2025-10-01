// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/use-toast';
import { AuthProvider } from '@/lib/auth';
import { AuthGate } from '@/components/AuthGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'VirtualAddressHub',
    description: 'Your professional London business address with secure digital mail.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
                <AuthProvider>
                    <ToastProvider>
                        <AuthGate>{children}</AuthGate>
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}