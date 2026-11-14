'use client';

import { BlogPage } from '@/components/BlogPage';
import { createNavigationHandler } from '@/lib/navigation-handler';
import { useRouter } from 'next/navigation';

interface BlogPageClientProps {
  initialPosts: any[];
}

export function BlogPageClient({ initialPosts }: BlogPageClientProps) {
  const router = useRouter();
  const handleNavigate = createNavigationHandler(router);
  return <BlogPage onNavigate={handleNavigate} initialPosts={initialPosts} />;
}
