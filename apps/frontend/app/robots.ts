import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    // Staging and previews: keep the whole site out of search engines.
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account/', '/dashboard/', '/mail/', '/forwarding/', '/login', '/signup', '/reset-password', '/forgot-password', '/verify-email-change'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
