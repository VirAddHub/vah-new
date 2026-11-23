'use client';

// Structured data for the homepage. Only facts we can stand behind: no ratings, review counts,
// prices, phone numbers, street addresses or founding dates until confirmed details are supplied.
export const SchemaMarkup = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VirtualAddressHub",
    "url": "https://virtualaddresshub.co.uk",
    "description": "UK virtual business address service with mail scanning and forwarding.",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": "support@virtualaddresshub.co.uk",
        "contactType": "customer support",
        "availableLanguage": ["English"],
        "areaServed": "GB"
      }
    ]
  },

  service: {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Virtual Business Address Service",
    "description": "UK virtual business address with mail handling, scanning and forwarding.",
    "provider": { "@type": "Organization", "name": "VirtualAddressHub" },
    "areaServed": { "@type": "Country", "name": "United Kingdom" },
    "serviceType": "Business Address Service"
  }
};

export function SchemaInjection({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
