'use client';

import Script from 'next/script';

export function GoogleAnalytics() {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

    if (!GA_ID) {
        return null;
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_title: document.title,
            // Origin + path only: query strings can carry reset/confirmation tokens (security review R50).
            page_location: window.location.origin + window.location.pathname,
          });
        `}
            </Script>
        </>
    );
}
