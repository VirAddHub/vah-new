"use client";

import { BlogPage as BlogPageComponent } from '@/components/BlogPage';
import { createNavigationHandler } from '@/lib/navigation-handler';
import { useRouter } from 'next/navigation';

/**
 * Blog Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function BlogPage() {
  const router = useRouter();
  const handleNavigate = createNavigationHandler(router);
  
  return <BlogPageComponent onNavigate={handleNavigate} />;
}
