import { BlogPage } from '@/components/BlogPage';

// Force dynamic rendering to prevent build-time issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Blog() {
    return <BlogPage />;
}
