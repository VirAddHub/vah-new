'use client';

import { useRouter } from 'next/navigation';
import { BlogPage } from '@/components/BlogPage';

export default function BlogIndexPage() {
  const router = useRouter();

  return (
    <BlogPage
      onNavigate={(page, data) => {
        if (page === 'blog-post' && data?.slug) {
          router.push(`/blog/${data.slug}`);
          return;
        }
        if (page === 'blog') {
          router.push('/blog');
          return;
        }
        if (page === 'home') {
          router.push('/');
          return;
        }
        // Fallback: push to the page name as path segment
        router.push(`/${page}`);
      }}
    />
  );
}

