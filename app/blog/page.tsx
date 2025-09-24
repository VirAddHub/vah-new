import { BlogPage } from '@/components/BlogPage';

export default function Blog() {
  const handleNavigate = (page: string, data?: any) => {
    // Handle navigation - you can enhance this with Next.js router later
    if (page === 'blog-post' && data?.slug) {
      window.location.href = `/blog/${data.slug}`;
    } else {
      window.location.href = `/${page}`;
    }
  };

  return <BlogPage onNavigate={handleNavigate} />;
}
