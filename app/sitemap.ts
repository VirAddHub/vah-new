import type { MetadataRoute } from 'next';

const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
    'https://www.virtualaddresshub.co.uk');

const STATIC_PATHS = [
  '/',
  '/about',
  '/how-it-works',
  '/pricing',
  '/blog',
  '/privacy',
  '/terms',
  '/kyc-policy',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }));

  return staticRoutes;
}
