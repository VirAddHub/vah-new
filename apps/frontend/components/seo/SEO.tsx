'use client';

import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  structuredData?: any;
  noIndex?: boolean;
  noFollow?: boolean;
}

export function SEO({
  title = 'VirtualAddressHub - Professional UK Virtual Business Address Service',
  description = 'Get a prestigious London business address for your UK company. Professional mail handling, HMRC compliance, Companies House registration. Trusted by 1000+ businesses.',
  keywords = [
    'virtual business address',
    'UK company address',
    'London business address',
    'registered office address',
    'mail forwarding UK',
    'virtual office London',
    'Companies House address',
    'HMRC compliance',
    'business mail handling',
    'professional address service'
  ],
  canonical,
  ogImage = '/images/og-image.jpg',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
  noIndex = false,
  noFollow = false
}: SEOProps) {
  const fullTitle = title.includes('VirtualAddressHub') ? title : `${title} | VirtualAddressHub`;
  const fullDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="VirtualAddressHub" />
      <meta name="robots" content={`${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="VirtualAddressHub" />
      <meta property="og:locale" content="en_GB" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@VirtualAddressHub" />
      
      {/* Additional SEO Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#00B4D8" />
      <meta name="msapplication-TileColor" content="#00B4D8" />
      
      {/* Language and Region */}
      <meta name="language" content="English" />
      <meta name="geo.region" content="GB" />
      <meta name="geo.country" content="United Kingdom" />
      
      {/* Mobile Optimization */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </Head>
  );
}

// Predefined SEO configurations for different pages
export const SEO_CONFIGS = {
  home: {
    title: 'VirtualAddressHub - Professional UK Virtual Business Address Service',
    description: 'Get a prestigious London business address for your UK company. Professional mail handling, HMRC compliance, Companies House registration. Trusted by 1000+ businesses.',
    keywords: [
      'virtual business address',
      'UK company address',
      'London business address',
      'registered office address',
      'mail forwarding UK',
      'virtual office London',
      'Companies House address',
      'HMRC compliance'
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "VirtualAddressHub",
      "url": "https://virtualaddresshub.com",
      "logo": "https://virtualaddresshub.com/images/logo.png",
      "description": "Professional UK virtual business address service",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "London",
        "addressCountry": "GB"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+44-20-1234-5678",
        "contactType": "customer service",
        "availableLanguage": "English"
      },
      "sameAs": [
        "https://twitter.com/VirtualAddressHub",
        "https://linkedin.com/company/virtualaddresshub"
      ]
    }
  },
  
  blog: {
    title: 'Business Address Blog - Expert Insights & Guides',
    description: 'Expert insights on virtual business addresses, UK company formation, HMRC compliance, and mail forwarding services. Stay informed with our comprehensive guides.',
    keywords: [
      'business address blog',
      'UK company formation guide',
      'HMRC compliance tips',
      'virtual office advice',
      'mail forwarding best practices',
      'Companies House updates'
    ]
  },
  
  pricing: {
    title: 'Virtual Address Pricing - Affordable UK Business Address Plans',
    description: 'Choose from our flexible virtual address plans starting from £9.99/month. Professional London address, mail handling, and full compliance support included.',
    keywords: [
      'virtual address pricing',
      'UK business address cost',
      'virtual office plans',
      'mail forwarding prices',
      'affordable business address'
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Virtual Business Address Service",
      "description": "Professional UK virtual business address service",
      "brand": {
        "@type": "Brand",
        "name": "VirtualAddressHub"
      },
      "offers": {
        "@type": "Offer",
        "price": "9.99",
        "priceCurrency": "GBP",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "9.99",
          "priceCurrency": "GBP"
        }
      }
    }
  },
  
  contact: {
    title: 'Contact VirtualAddressHub - Get Help with Your Business Address',
    description: 'Need help with your virtual business address? Contact our expert team for support with UK company formation, mail forwarding, and compliance questions.',
    keywords: [
      'contact virtual address hub',
      'business address support',
      'UK company help',
      'mail forwarding assistance',
      'virtual office support'
    ]
  }
};

// Breadcrumb structured data generator
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// FAQ structured data generator
export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
