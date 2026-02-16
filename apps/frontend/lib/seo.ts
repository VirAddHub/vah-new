import { Metadata } from 'next'

interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  canonical?: string
  ogImage?: string
  noIndex?: boolean
  structuredData?: Record<string, unknown>
}

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage = '/images/og-image.jpg',
    noIndex = false,
  } = config

  const fullTitle = `${title} | VirtualAddressHub - Professional London Business Address`
  const baseUrl = 'https://virtualaddresshub.com'
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: 'VirtualAddressHub' }],
    creator: 'VirtualAddressHub',
    publisher: 'VirtualAddressHub',
    robots: noIndex ? 'noindex,nofollow' : 'index,follow',
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url: canonicalUrl,
      title: fullTitle,
      description,
      siteName: 'VirtualAddressHub',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@VirtualAddressHub',
    },
    alternates: {
      canonical: canonicalUrl,
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_VERIFICATION,
    },
    category: 'Business Services',
  }
}

// Structured Data Schemas
export const businessSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "VirtualAddressHub",
  "alternateName": "VAH",
  "url": "https://virtualaddresshub.com",
  "logo": "https://virtualaddresshub.com/images/logo.png",
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
}

export const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Virtual Business Address Service",
  "description": "Professional London business address with secure digital mail forwarding",
  "provider": {
    "@type": "Organization",
    "name": "VirtualAddressHub"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United Kingdom"
  },
  "serviceType": "Business Services",
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "GBP",
    "priceValidUntil": "2025-12-31",
    "availability": "https://schema.org/InStock"
  }
}

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a virtual business address?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A virtual business address is a professional address you can use for your business registration, mail handling, and correspondence without needing a physical office space."
      }
    },
    {
      "@type": "Question", 
      "name": "How does mail forwarding work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We receive your mail at our secure London facility, scan it digitally, and forward it to you via email or physical forwarding to your chosen address."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use this address for company registration?",
      "acceptedAnswer": {
        "@type": "Answer", 
        "text": "Yes, our London business address can be used for Companies House registration and other official business purposes."
      }
    }
  ]
}
