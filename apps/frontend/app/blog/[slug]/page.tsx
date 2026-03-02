'use client';

import { useRouter } from 'next/navigation';
import { BlogPostPage } from '@/components/BlogPostPage';

interface BlogPostRouteProps {
  params: { slug: string };
}

export default function BlogPostRoute({ params }: BlogPostRouteProps) {
  const router = useRouter();
  const { slug } = params;

  return (
    <BlogPostPage
      slug={slug}
      onBack={() => router.push('/blog')}
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
        router.push(`/${page}`);
      }}
    />
  );
}

