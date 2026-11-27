import type { MetadataRoute } from 'next';
import { helpArticles } from '@/lib/help-content';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

type Post = { slug?: string; updated_at?: string | number; date?: string; published_at?: string };

/** Published blog posts, so search engines find every article (not just the blog index). */
async function blogPosts(): Promise<MetadataRoute.Sitemap> {
  try {
    const backend = (
      process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com'
    )
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
    const res = await fetch(`${backend}/api/blog/posts`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts: Post[] = data?.ok && Array.isArray(data.data) ? data.data : [];
    return posts
      .filter((p) => typeof p.slug === 'string' && p.slug)
      .map((p) => {
        const when = new Date((p.updated_at ?? p.published_at ?? p.date) as string | number);
        return {
          url: `${SITE_URL}/blog/${encodeURIComponent(p.slug as string)}`,
          ...(Number.isNaN(when.getTime()) ? {} : { lastModified: when }),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        };
      });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = (
    path: string,
    changeFrequency: 'weekly' | 'monthly' | 'yearly',
    priority: number,
  ) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page('', 'weekly', 1),
    page('/services', 'monthly', 0.9),
    page('/registered-office-address', 'monthly', 0.8),
    page('/directors-service-address', 'monthly', 0.8),
    page('/pricing', 'weekly', 0.9),
    page('/how-it-works', 'monthly', 0.7),
    page('/about', 'monthly', 0.7),
    page('/contact', 'monthly', 0.6),
    page('/help', 'weekly', 0.7),
    ...helpArticles.map((article) => page(`/help/${article.slug}`, 'monthly', 0.6)),
    page('/blog', 'weekly', 0.7),
    page('/terms', 'yearly', 0.3),
    page('/privacy', 'yearly', 0.3),
    page('/cookies', 'yearly', 0.3),
    ...(await blogPosts()),
  ];
}
