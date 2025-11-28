// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastRoot } from '@/components/ToastRoot';
import { SWRProvider } from '@/components/SWRProvider';
import { Providers } from '@/components/Providers';
import { WebVitalsProvider } from '@/components/WebVitalsProvider';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://virtualaddresshub.com'),
    title: 'VirtualAddressHub - Professional London Business Address & Mail Forwarding',
    description: 'Get a prestigious London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services. Trusted by 1000+ businesses.',
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
    robots: 'index,follow',
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
        url: 'https://virtualaddresshub.com',
        title: 'VirtualAddressHub - Professional London Business Address',
        description: 'Get a prestigious London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.',
        siteName: 'VirtualAddressHub',
        images: [
            {
                url: '/images/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'VirtualAddressHub - Professional London Business Address',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'VirtualAddressHub - Professional London Business Address',
        description: 'Get a prestigious London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.',
        images: ['/images/og-image.jpg'],
        creator: '@VirtualAddressHub',
    },
    alternates: {
        canonical: 'https://virtualaddresshub.com',
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
        'geo.position': '51.5074;-0.1278',
        'ICBM': '51.5074, -0.1278',
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
        <html lang="en">
            <head>
                <meta name="format-detection" content="telephone=no" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            // Force light mode - remove dark class immediately
                            (function() {
                                document.documentElement.classList.remove('dark');
                                localStorage.setItem('theme', 'light');
                            })();
                        `,
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "VirtualAddressHub",
                            "alternateName": "VAH",
                            "url": "https://virtualaddresshub.com",
                            "logo": "https://virtualaddresshub.com/images/logo.svg",
                            "description": "Professional London business address service with secure digital mail forwarding and virtual office solutions.",
                            "foundingDate": "2024",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "123 Business Street",
                                "addressLocality": "London",
                                "addressRegion": "England",
                                "postalCode": "SW1A 1AA",
                                "addressCountry": "GB"
                            },
                            "contactPoint": {
                                "@type": "ContactPoint",
                                "telephone": "+44-20-1234-5678",
                                "contactType": "customer service",
                                "areaServed": "GB",
                                "availableLanguage": "English"
                            },
                            "sameAs": [
                                "https://twitter.com/VirtualAddressHub",
                                "https://linkedin.com/company/virtualaddresshub"
                            ],
                            "service": [
                                {
                                    "@type": "Service",
                                    "name": "Virtual Business Address",
                                    "description": "Professional London business address for company registration and mail handling"
                                },
                                {
                                    "@type": "Service",
                                    "name": "Mail Forwarding",
                                    "description": "Secure digital mail scanning and forwarding service"
                                },
                                {
                                    "@type": "Service",
                                    "name": "Virtual Office",
                                    "description": "Complete virtual office solution with business address and mail services"
                                }
                            ]
                        })
                    }}
                />
            </head>
            <body className={`${inter.variable} font-sans min-h-screen bg-white md:bg-background text-foreground antialiased`} suppressHydrationWarning>
                <WebVitalsProvider>
                    <SWRProvider>
                        <Providers>
                            <ToastRoot>{children}</ToastRoot>
                        </Providers>
                    </SWRProvider>
                </WebVitalsProvider>
            </body>
        </html>
    );
}