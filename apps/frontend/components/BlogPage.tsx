'use client';

import { useMemo, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type BlogPost = {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    // Placeholder date labels for display only
    dateLong: string; // e.g., "DD Month YYYY"
    dateShort: string; // e.g., "DD Mon"
    readTime: string;
    category: string;
    imageUrl: string;
};

interface BlogPageProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function BlogPage({ onNavigate }: BlogPageProps) {
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch blog posts from API
    useEffect(() => {
        const fetchBlogPosts = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
                const response = await fetch(`${apiUrl}/api/blog/posts`);

                const contentType = response.headers.get("content-type") || "";
                if (!contentType.toLowerCase().includes("application/json")) {
                    const text = await response.text().catch(() => "");
                    console.error('[BlogPage] Non-JSON response:', response.status, contentType, text.slice(0, 200));
                    setError('Failed to load blog posts');
                    setLoading(false);
                    return;
                }

                let data: any;
                try {
                    data = await response.json();
                } catch (err) {
                    const text = await response.text().catch(() => "");
                    console.error('[BlogPage] JSON parse error:', response.status, text.slice(0, 200));
                    setError('Failed to load blog posts');
                    setLoading(false);
                    return;
                }

                if (data.ok) {
                    setBlogPosts(data.data);
                } else {
                    setError('Failed to load blog posts');
                }
            } catch (err) {
                console.error('Error fetching blog posts:', err);
                setError('Failed to load blog posts');
            } finally {
                setLoading(false);
            }
        };

        fetchBlogPosts();
    }, []);

    // Generate structured data for SEO based on fetched posts
    const blogStructuredData = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "VirtualAddressHub Business Blog",
        "description": "Expert insights on virtual business addresses, UK company formation, HMRC compliance, and mail forwarding services.",
        "url": "https://virtualaddresshub.com/blog",
        "publisher": {
            "@type": "Organization",
            "name": "VirtualAddressHub",
            "url": "https://virtualaddresshub.com"
        },
        "blogPost": blogPosts.map(post => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "url": `https://virtualaddresshub.com/blog/${post.slug}`,
            "datePublished": post.dateLong,
            "author": {
                "@type": "Organization",
                "name": "VirtualAddressHub"
            }
        }))
    }), [blogPosts]);

    const gridPosts = useMemo(() => {
        return blogPosts;
    }, [blogPosts]);

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="bg-white py-[100px] px-20">
                <div className="max-w-[1280px] mx-auto">
                    <div className="flex flex-col items-center gap-[18px] mb-12">
                        <h1 className="text-[54px] font-medium text-[#161B1A] leading-[1.2] text-center" style={{ fontFamily: 'Poppins' }}>
                            Insights & Resources for Modern Businesses
                        </h1>
                        <p className="text-lg text-[#666666] leading-[1.4] text-center max-w-[746px]" style={{ fontFamily: 'Poppins' }}>
                            Expert advice, industry insights, and success stories to help you grow your business
                        </p>
                    </div>
                    {/* Search Bar */}
                    <div className="flex justify-center">
                        <div className="flex items-center gap-[65px] bg-[#F9F9F9] rounded-[87px] px-[34px] py-[14px] w-full max-w-[858px]">
                            <input
                                type="text"
                                placeholder="Search for activities, restaurants, coupons"
                                className="flex-1 bg-transparent border-none outline-none text-base text-[#ADADAD] placeholder:text-[#ADADAD]"
                                style={{ fontFamily: 'Poppins' }}
                            />
                            <div className="w-12 h-12 bg-[#40C46C] rounded-[40px] flex items-center justify-center cursor-pointer">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M14 14L11.1 11.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="container mx-auto px-4 py-12">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading blog posts...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="container mx-auto px-4 py-12">
                    <div className="text-center">
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-white py-[100px] px-20">
                <div className="max-w-[1280px] mx-auto">
                    {/* Blog Posts Grid */}
                    {!loading && !error && gridPosts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 justify-center">
                            {gridPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex flex-col gap-[14px] w-full max-w-[395px] cursor-pointer"
                                    onClick={() => onNavigate?.('blog-post', { slug: post.slug })}
                                >
                                    {/* Image */}
                                    <div className="relative w-full h-[238px] rounded-[20px] overflow-hidden">
                                        <ImageWithFallback
                                            src={post.imageUrl}
                                            alt={post.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Content */}
                                    <div className="flex flex-col gap-[10px]">
                                        {/* Category Tags */}
                                        <div className="flex items-center gap-2">
                                            <div className="bg-[#F9F9F9] rounded-[22px] px-[10px] py-0 flex items-center justify-center h-[34px]">
                                                <span className="text-xs text-[#666666] leading-[1.4]" style={{ fontFamily: 'Poppins' }}>
                                                    {post.category || 'Success Stories'}
                                                </span>
                                            </div>
                                            <div className="bg-[#F9F9F9] rounded-[22px] px-[10px] py-0 flex items-center justify-center h-[34px]">
                                                <span className="text-xs text-[#666666] leading-[1.4]" style={{ fontFamily: 'Poppins' }}>
                                                    {post.category || 'Success Stories'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Title */}
                                        <h3 className="text-2xl font-medium text-[#0F1D07] leading-[1.4] line-clamp-2" style={{ fontFamily: 'Poppins' }}>
                                            {post.title}
                                        </h3>
                                        {/* Description */}
                                        <p className="text-lg text-[#666666] leading-[1.4] line-clamp-3" style={{ fontFamily: 'Poppins' }}>
                                            {post.excerpt}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && !error && gridPosts.length === 0 && (
                        <div className="text-center text-[#666666]">
                            No posts found.
                        </div>
                    )}
                </div>
            </div>

            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(blogStructuredData)
                }}
            />
        </div>
    );
}
