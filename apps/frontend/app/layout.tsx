// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/use-toast';
import { SWRProvider } from '@/components/SWRProvider';
import { Providers } from '@/components/Providers';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600'],
});

export const metadata: Metadata = {
    title: 'VirtualAddressHub',
    description: 'Your professional London business address with secure digital mail.',
    manifest: '/manifest.json',
    icons: {
        icon: '/icons/icon-192.png',
        apple: '/icons/icon-192.png',
        other: [
            { rel: 'mask-icon', url: '/icons/maskable-512.png' }
        ]
    },
    themeColor: '#111827',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="format-detection" content="telephone=no" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            </head>
            <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
                <SWRProvider>
                    <Providers>
                        <ToastProvider>{children}</ToastProvider>
                    </Providers>
                </SWRProvider>
            </body>
        </html>
    );
}