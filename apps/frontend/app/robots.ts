import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const isProd = env === 'production';

  if (!isProd) {
    // Prevent duplicate content indexing from preview/staging/dev deployments.
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://virtualaddresshub.co.uk';

  // Production: indexable, but block app/sensitive paths (same intent as legacy public robots).
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/_next/',
          '/login/',
          '/signup/',
          '/reset-password/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
