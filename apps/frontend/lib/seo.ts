// Next.js metadata generation functions
export function generateMetadata(page: string, data?: any) {
  const meta = PAGE_META[page as keyof typeof PAGE_META];

  if (typeof meta === 'function') {
    return meta(data);
  }

  return meta || PAGE_META.home;
}

// Schema exports for pages
export const businessSchema = {
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
  }
};

export const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Virtual Business Address Service",
  "description": "Professional UK virtual business address service with mail handling and compliance support",
  "provider": {
    "@type": "Organization",
    "name": "VirtualAddressHub"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United Kingdom"
  },
  "serviceType": "Business Address Service"
};

// Dynamic sitemap generation for better SEO
export function generateSitemap() {
  const baseUrl = 'https://virtualaddresshub.com';
  const currentDate = new Date().toISOString().split('T')[0];

  const staticPages = [
    {
      url: '/',
      changefreq: 'weekly',
      priority: '1.0',
      lastmod: currentDate
    },
    {
      url: '/blog',
      changefreq: 'daily',
      priority: '0.9',
      lastmod: currentDate
    },
    {
      url: '/pricing',
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: currentDate
    },
    {
      url: '/about',
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: currentDate
    },
    {
      url: '/contact',
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: currentDate
    },
    {
      url: '/help',
      changefreq: 'weekly',
      priority: '0.6',
      lastmod: currentDate
    },
    {
      url: '/terms',
      changefreq: 'yearly',
      priority: '0.3',
      lastmod: currentDate
    },
    {
      url: '/privacy',
      changefreq: 'yearly',
      priority: '0.3',
      lastmod: currentDate
    },
    {
      url: '/kyc-policy',
      changefreq: 'yearly',
      priority: '0.3',
      lastmod: currentDate
    }
  ];

  // Generate blog post URLs (this would be dynamic in a real app)
  const blogPosts = [
    'what-is-registered-office-address',
    'virtual-address-uk-limited-company',
    'virtual-address-vs-po-box',
    'mail-forwarding-virtual-office'
  ];

  const blogPages = blogPosts.map(slug => ({
    url: `/blog/${slug}`,
    changefreq: 'monthly',
    priority: '0.8',
    lastmod: currentDate
  }));

  const allPages = [...staticPages, ...blogPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

// Robots.txt generator
export function generateRobotsTxt() {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: https://virtualaddresshub.com/sitemap.xml

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /blog/
Allow: /pricing/
Allow: /about/
Allow: /contact/
Allow: /help/

# Crawl delay for respectful crawling
Crawl-delay: 1`;
}

// Meta tags for different page types
export const PAGE_META = {
  home: {
    title: 'VirtualAddressHub - Professional UK Virtual Business Address Service',
    description: 'Get a prestigious London business address for your UK company. Professional mail handling, HMRC compliance, Companies House registration. Trusted by 1000+ businesses.',
    keywords: 'virtual business address, UK company address, London business address, registered office address, mail forwarding UK'
  },

  blog: {
    title: 'Business Address Blog - Expert Insights & Guides | VirtualAddressHub',
    description: 'Expert insights on virtual business addresses, UK company formation, HMRC compliance, and mail forwarding services. Stay informed with our comprehensive guides.',
    keywords: 'business address blog, UK company formation guide, HMRC compliance tips, virtual office advice'
  },

  blogPost: (title: string, description: string) => ({
    title: `${title} | VirtualAddressHub Blog`,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords: 'virtual business address, UK company formation, business compliance, mail forwarding'
  }),

  pricing: {
    title: 'Virtual Address Pricing - Affordable UK Business Address Plans | VirtualAddressHub',
    description: 'Choose from our flexible virtual address plans starting from £9.99/month. Professional London address, mail handling, and full compliance support included.',
    keywords: 'virtual address pricing, UK business address cost, virtual office plans, mail forwarding prices'
  },

  contact: {
    title: 'Contact VirtualAddressHub - Get Help with Your Business Address',
    description: 'Need help with your virtual business address? Contact our expert team for support with UK company formation, mail forwarding, and compliance questions.',
    keywords: 'contact virtual address hub, business address support, UK company help, mail forwarding assistance'
  }
};

// Performance optimization meta tags
export const PERFORMANCE_META = {
  preload: [
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    { href: '/images/hero-bg.webp', as: 'image' }
  ],

  prefetch: [
    { href: '/blog' },
    { href: '/pricing' },
    { href: '/contact' }
  ],

  dnsPrefetch: [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://api.virtualaddresshub.com'
  ]
};

// Schema.org structured data templates
export const SCHEMA_TEMPLATES = {
  organization: {
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
    }
  },

  service: {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Virtual Business Address Service",
    "description": "Professional UK virtual business address service with mail handling and compliance support",
    "provider": {
      "@type": "Organization",
      "name": "VirtualAddressHub"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United Kingdom"
    },
    "serviceType": "Business Address Service"
  },

  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://virtualaddresshub.com${item.url}`
    }))
  })
};