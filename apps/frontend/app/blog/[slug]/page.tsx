import { BlogPostPage } from '@/components/BlogPostPage';
import { Metadata } from 'next';

interface BlogPostProps {
    params: {
        slug: string;
    };
}

// Generate metadata for blog posts
export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
    const { slug } = params;
    
    // You can fetch post data here or use a static mapping
    const postData = getPostData(slug);
    
    return {
        title: `${postData.title} | VirtualAddressHub Blog`,
        description: postData.excerpt,
        keywords: [
            'virtual business address',
            'London business address',
            'UK company formation',
            'business compliance',
            'virtual office',
            'mail forwarding'
        ],
        openGraph: {
            title: postData.title,
            description: postData.excerpt,
            type: 'article',
            publishedTime: postData.publishedTime,
            authors: ['VirtualAddressHub'],
            tags: [postData.category],
        },
        twitter: {
            card: 'summary_large_image',
            title: postData.title,
            description: postData.excerpt,
        },
    };
}

// Helper function to get post data (you can replace this with your actual data source)
function getPostData(slug: string) {
    const posts: Record<string, any> = {
        'what-is-a-registered-office-address': {
            title: 'What is a Registered Office Address and Why Your UK Company Needs One',
            excerpt: 'Every UK company must have a registered office address. Learn what it is, why it\'s required, and how to choose the right one for your business.',
            category: 'Company Formation',
            publishedTime: '2024-01-15T00:00:00Z'
        },
        'uk-company-formation-complete-guide': {
            title: 'UK Company Formation: A Complete Guide for 2024',
            excerpt: 'Step-by-step guide to forming a UK company, including required documents, costs, and timeline. Everything you need to know to get started.',
            category: 'Business Setup',
            publishedTime: '2024-01-10T00:00:00Z'
        },
        'virtual-address-vs-postal-address': {
            title: 'Virtual Address vs Postal Address: What\'s the Difference?',
            excerpt: 'Understanding the key differences between virtual addresses and traditional postal addresses for your business needs.',
            category: 'Virtual Addresses',
            publishedTime: '2024-01-05T00:00:00Z'
        }
    };
    
    return posts[slug] || {
        title: 'Blog Post',
        excerpt: 'Read our latest insights on virtual business addresses and UK compliance.',
        category: 'Business',
        publishedTime: new Date().toISOString()
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
