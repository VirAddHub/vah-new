import type { Metadata } from 'next';
import { BlogPageClient } from './BlogPageClient';

export const metadata: Metadata = {
  title: 'Business Address Guides & Articles | VirtualAddressHub',
  description:
    'Practical guides for UK company owners: registered office rules, Companies House, business addresses and handling official mail.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Guides & articles | VirtualAddressHub', url: '/blog' },
};

/**
 * Blog index — Server Component.
 * Fetches posts server-side so the page renders with data immediately,
 * avoiding the client-side waterfall and Render cold-start delay.
 */
async function fetchBlogPosts() {
  try {
    const backend = (
      process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com'
    )
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');

    const res = await fetch(`${backend}/api/blog/posts`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 }, // cache 2 mins server-side
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data?.ok && Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const initialPosts = await fetchBlogPosts();
  return <BlogPageClient initialPosts={initialPosts} />;
}
