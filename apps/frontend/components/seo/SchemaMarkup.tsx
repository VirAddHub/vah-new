'use client';

// Advanced Schema.org structured data for maximum SEO impact
export const SchemaMarkup = {
  // Organization schema with enhanced details
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VirtualAddressHub",
    "alternateName": "VAH",
    "url": "https://virtualaddresshub.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://virtualaddresshub.com/images/logo.png",
      "width": 200,
      "height": 60
    },
    "description": "Professional UK virtual business address service providing prestigious London addresses for companies, mail handling, and full compliance support.",
    "foundingDate": "2020",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Business Street",
      "addressLocality": "London",
      "postalCode": "EC1A 4HD",
      "addressCountry": "GB"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+44-20-1234-5678",
        "contactType": "customer service",
        "availableLanguage": ["English"],
        "areaServed": "GB",
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "17:00"
        }
      },
      {
        "@type": "ContactPoint",
        "email": "support@virtualaddresshub.com",
        "contactType": "customer support",
        "availableLanguage": ["English"]
      }
    ],
    "sameAs": [
      "https://twitter.com/VirtualAddressHub",
      "https://linkedin.com/company/virtualaddresshub",
      "https://facebook.com/VirtualAddressHub"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Virtual Address Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Basic Virtual Address",
            "description": "Professional London business address with mail handling"
          },
          "price": "9.99",
          "priceCurrency": "GBP",
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": "9.99",
            "priceCurrency": "GBP"
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1247",
      "bestRating": "5",
      "worstRating": "1"
    }
  },

  // Service schema
  service: {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Virtual Business Address Service",
    "description": "Professional UK virtual business address service with mail handling, scanning, forwarding, and full compliance support for Companies House and HMRC.",
    "provider": {
      "@type": "Organization",
      "name": "VirtualAddressHub"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United Kingdom"
    },
    "serviceType": "Business Address Service",
    "category": "Business Services",
    "offers": {
      "@type": "Offer",
      "price": "9.99",
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "validFrom": "2024-01-01"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Virtual Address Plans",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Basic Plan",
            "description": "Essential virtual address service"
          },
          "price": "9.99",
          "priceCurrency": "GBP"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Professional Plan",
            "description": "Advanced virtual address with premium features"
          },
          "price": "19.99",
          "priceCurrency": "GBP"
        }
      ]
    }
  },

  // FAQ schema generator
  generateFAQ: (faqs: Array<{ question: string; answer: string }>) => ({
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
  }),

  // Breadcrumb schema generator
  generateBreadcrumb: (items: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://virtualaddresshub.com${item.url}`
    }))
  }),

  // Local business schema
  localBusiness: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "VirtualAddressHub",
    "description": "Professional virtual business address service in London",
    "url": "https://virtualaddresshub.com",
    "telephone": "+44-20-1234-5678",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Business Street",
      "addressLocality": "London",
      "postalCode": "EC1A 4HD",
      "addressCountry": "GB"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "51.5074",
      "longitude": "-0.1278"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    },
    "priceRange": "££",
    "paymentAccepted": "Credit Card, Bank Transfer, PayPal",
    "currenciesAccepted": "GBP"
  },

  // Product schema for pricing page
  product: {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Virtual Business Address Service",
    "description": "Professional UK virtual business address service with mail handling and compliance support",
    "brand": {
      "@type": "Brand",
      "name": "VirtualAddressHub"
    },
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "9.99",
      "highPrice": "49.99",
      "priceCurrency": "GBP",
      "offerCount": "3",
      "offers": [
        {
          "@type": "Offer",
          "name": "Basic Plan",
          "price": "9.99",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "validFrom": "2024-01-01"
        },
        {
          "@type": "Offer",
          "name": "Professional Plan",
          "price": "19.99",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "validFrom": "2024-01-01"
        },
        {
          "@type": "Offer",
          "name": "Enterprise Plan",
          "price": "49.99",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "validFrom": "2024-01-01"
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1247",
      "bestRating": "5",
      "worstRating": "1"
    }
  },

  // Article schema for blog posts
  generateArticle: (article: {
    title: string;
    description: string;
    url: string;
    datePublished: string;
    dateModified?: string;
    author?: string;
    image?: string;
    wordCount?: number;
    readTime?: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "url": article.url,
    "datePublished": article.datePublished,
    "dateModified": article.dateModified || article.datePublished,
    "author": {
      "@type": "Organization",
      "name": article.author || "VirtualAddressHub"
    },
    "publisher": {
      "@type": "Organization",
      "name": "VirtualAddressHub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://virtualaddresshub.com/images/logo.png"
      }
    },
    "image": article.image || "https://virtualaddresshub.com/images/og-image.jpg",
    "wordCount": article.wordCount || 0,
    "timeRequired": article.readTime || "5 min read",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url
    }
  }),

  // Review schema
  generateReview: (review: {
    rating: number;
    reviewBody: string;
    author: string;
    datePublished: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "Service",
      "name": "Virtual Business Address Service"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating,
      "bestRating": "5",
      "worstRating": "1"
    },
    "reviewBody": review.reviewBody,
    "author": {
      "@type": "Person",
      "name": review.author
    },
    "datePublished": review.datePublished
  })
};

// Component to inject schema markup
export function SchemaInjection({ schema }: { schema: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
