// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { SITE_URL, ALLOW_INDEXING } from '@/lib/site';
import './globals.css';
import './customer-theme.css';
import { CustomerTheme } from '@/components/CustomerTheme';
import { inter, plex, dmsans, newsreader } from '@/lib/fonts';
import { ToastRoot } from '@/components/ToastRoot';
import { SWRProvider } from '@/components/SWRProvider';
import { Providers } from '@/components/Providers';
import { WebVitalsProvider } from '@/components/WebVitalsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Typography: Inter for text (`font-sans`), IBM Plex Mono for figures (`font-mono`), both via next/font.
 */

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: 'VirtualAddressHub - Professional London Business Address & Mail Forwarding',
    description: 'Get a professional London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.',
    keywords: [
        'virtual business address',
        'London business address',
        'mail forwarding service',
        'virtual office London',
        'company registration address',
        'business mail handling',
        'digital mail scanning',
        'professional address service',
        'UK business address',
        'mail scanning service'
    ],
    authors: [{ name: 'VirtualAddressHub' }],
    creator: 'VirtualAddressHub',
    publisher: 'VirtualAddressHub',
    robots: ALLOW_INDEXING ? 'index,follow' : 'noindex,nofollow',
    manifest: '/manifest.json',
    icons: {
        icon: '/icons/icon-192.png',
        apple: '/icons/icon-192.png',
        other: [
            { rel: 'mask-icon', url: '/icons/maskable-512.png' }
        ]
    },
    openGraph: {
        type: 'website',
        locale: 'en_GB',
        url: 'https://virtualaddresshub.co.uk',
        title: 'VirtualAddressHub - Professional London Business Address',
        description: 'Get a professional London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.',
        siteName: 'VirtualAddressHub',
        images: [{ url: '/social-card', width: 1200, height: 630, alt: 'VirtualAddressHub: a London SE1 business address with same-day mail scanning' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'VirtualAddressHub - Professional London Business Address',
        description: 'Get a professional London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.',
        images: ['/social-card'],
        creator: '@VirtualAddressHub',
    },
    verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
        yandex: process.env.YANDEX_VERIFICATION,
        yahoo: process.env.YAHOO_VERIFICATION,
    },
    category: 'Business Services',
    other: {
        'geo.region': 'GB',
        'geo.placename': 'London',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#111827',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${plex.variable} ${dmsans.variable} ${newsreader.variable}`} suppressHydrationWarning>
            <head>
                <meta name="format-detection" content="telephone=no" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "VirtualAddressHub",
                            "alternateName": "VAH",
                            "url": "https://virtualaddresshub.co.uk",
                            "logo": "https://virtualaddresshub.co.uk/images/logo-green.svg",
                            "description": "London SE1 business address by Tower Bridge, with same-day mail scanning, registered office and director's service address in one plan.",
                            "foundingDate": "2024",
                            "address": { "@type": "PostalAddress", "addressLocality": "London", "postalCode": "SE1", "addressCountry": "GB" },
                            "areaServed": "GB",
                            "contactPoint": {
                                "@type": "ContactPoint",
                                "email": "support@virtualaddresshub.co.uk",
                                "contactType": "customer service",
                                "areaServed": "GB",
                                "availableLanguage": "English",
                                "hoursAvailable": { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00" }
                            },
                            "makesOffer": [
                                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Virtual office and business address, London SE1" } },
                                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Registered office address" } },
                                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Director's service address" } },
                                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Same-day mail scanning and forwarding" } }
                            ]
                        })
                    }}
                />
            </head>
            <body className="font-sans font-normal not-italic min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
                >
                    Skip to main content
                </a>
                <ErrorBoundary>
                    <WebVitalsProvider>
                        <SWRProvider>
                            <Providers>
                                <CustomerTheme><ToastRoot>{children}</ToastRoot></CustomerTheme>
                            </Providers>
                        </SWRProvider>
                    </WebVitalsProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
