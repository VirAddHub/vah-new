import { BlogPostPage } from '@/components/BlogPostPage';

interface BlogPostProps {
  params: {
    slug: string;
  };
}

export default function BlogPost({ params }: BlogPostProps) {
  const handleNavigate = (page: string, data?: any) => {
    // Handle navigation - you can enhance this with Next.js router later
    if (page === 'home') {
      window.location.href = '/';
    } else if (page === 'blog-post' && data?.slug) {
      window.location.href = `/blog/${data.slug}`;
    } else {
      window.location.href = `/${page}`;
    }
  };

  const handleBack = () => {
    window.location.href = '/blog';
  };

  return (
    <BlogPostPage 
      slug={params.slug} 
      onNavigate={handleNavigate}
      onBack={handleBack}
    />
  );
}
