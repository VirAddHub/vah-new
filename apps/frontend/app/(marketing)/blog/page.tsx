"use client";

import { BlogPage as BlogPageComponent } from '@/components/BlogPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { createNavigationHandler } from '@/lib/navigation-handler';
import { useRouter } from 'next/navigation';

export default function BlogPage() {
  const router = useRouter();
  const handleNavigate = createNavigationHandler(router);
  
  return (
    <div className="min-h-screen flex flex-col relative bg-[#F6F6F7]">
      <HeaderWithNav />
      <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
        <BlogPageComponent onNavigate={handleNavigate} />
      </main>
      <FooterWithNav />
    </div>
  );
}
