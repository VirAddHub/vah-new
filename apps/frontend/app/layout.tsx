// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/use-toast';
import dynamic from 'next/dynamic';
import { SWRConfig } from 'swr';
import { flexFetcher } from '@/lib/swr';
import { autoRefresh } from '@/lib/swrAutoRefresh';

const Providers = dynamic(() => import('@/components/Providers'), { ssr: false });

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600'],
});

export const metadata: Metadata = {
    title: 'VirtualAddressHub',
    description: 'Your professional London business address with secure digital mail.',
    manifest: '/manifest.json',
    themeColor: '#0A7AFF',
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
                <SWRConfig
                    value={{
                        fetcher: flexFetcher,
                        revalidateIfStale: true,
                        revalidateOnFocus: true, // Refresh when tab gains focus
                        revalidateOnReconnect: true, // Refresh when back online
                        focusThrottleInterval: 15000, // Throttle focus refresh (15s)
                        dedupingInterval: 1000, // Dedupe requests within 1s
                        keepPreviousData: true, // Keep previous data while refreshing (no jank)
                        loadingTimeout: 3000, // Dev feedback for slow requests
                        // Apply auto-refresh middleware to specific API prefixes
                        use: [
                            autoRefresh({ prefix: '/api/mail-items', intervalMs: 15000 }),
                            autoRefresh({ prefix: '/api/billing', intervalMs: 20000 }),
                            autoRefresh({ prefix: '/api/admin', intervalMs: 20000 }),
                        ],
                    }}
                >
                    <Providers>
                        <ToastProvider>{children}</ToastProvider>
                    </Providers>
                </SWRConfig>
            </body>
        </html>
    );
}