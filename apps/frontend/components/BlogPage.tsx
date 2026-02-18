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

function MobileBlogCard({ post, onNavigate }: { post: BlogPost; onNavigate?: (page: string, data?: any) => void }) {
    const [imageError, setImageError] = useState(false);
    const title = post.title?.trim() || "Untitled post";
    const excerpt = post.excerpt?.trim();
    const category = post.category?.trim() || "Blog";
    const hasValidImage = post.imageUrl && !imageError;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={() => onNavigate?.("blog-post", { slug: post.slug })}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigate?.("blog-post", { slug: post.slug });
                }
            }}
            className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
            <div className="relative aspect-[16/9] w-full bg-zinc-100">
                {hasValidImage ? (
                    <img
                        src={post.imageUrl}
                        alt={title}
                        className="object-cover w-full h-full"
                        onError={() => setImageError(true)}
                        decoding="async"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500" aria-hidden="true">
                        No preview image
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {category}
                    </span>
                </div>
                <h2 className="text-xl leading-7 font-semibold text-zinc-900 line-clamp-2">
                    {title}
                </h2>
                {excerpt ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-600 line-clamp-3">
                        {excerpt}
                    </p>
                ) : null}
                <div className="mt-3 text-xs text-zinc-500">
                    {post.dateShort && post.readTime ? `${post.dateShort} · ${post.readTime}` : post.dateLong || post.dateShort || ""}
                </div>
            </div>
        </article>
    );
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
        <div className="bg-white">
            {/* Hero Section — mobile-first, reduced top/bottom space */}
            <section className="bg-white">
                <div className="mx-auto max-w-6xl px-6 pt-10 pb-8 sm:pt-14 sm:pb-10 lg:px-8">
                    <div className="max-w-2xl">
                        <h1 className="text-[34px] leading-[1.08] tracking-tight font-semibold text-[#161B1A] sm:text-5xl">
                            Insights &amp; Resources for Modern Businesses
                        </h1>
                        <p className="mt-4 text-base leading-6 text-[#666666] sm:text-lg">
                            Expert advice, industry insights, and success stories to help you grow your business.
                        </p>
                    </div>
                    {/* Search Bar - desktop/tablet only */}
                    <div className="hidden lg:flex justify-center mt-6">
                        <div className="flex items-center gap-[65px] bg-[#F9F9F9] rounded-[87px] px-[34px] py-[14px] w-full max-w-[858px]">
                            <input
                                type="text"
                                placeholder="Search articles…"
                                className="flex-1 bg-transparent border-none outline-none text-base text-[#ADADAD] placeholder:text-[#ADADAD]"
                                style={{ fontFamily: 'Poppins' }}
                            />
                            <div className="w-12 h-12 bg-[#206039] rounded-[40px] flex items-center justify-center cursor-pointer">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M14 14L11.1 11.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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

            <div className="mx-auto max-w-6xl px-6 pb-14 sm:pb-16 lg:px-8">
                <div className="max-w-[1280px] mx-auto">
                    {/* Mobile Blog List (< lg) */}
                    {!loading && !error && gridPosts.length > 0 && (
                        <div className="lg:hidden mt-8 space-y-4">
                            {gridPosts.map((post) => (
                                <MobileBlogCard key={post.id} post={post} onNavigate={onNavigate} />
                            ))}
                        </div>
                    )}
                    {/* Desktop Blog Grid (lg+) */}
                    {!loading && !error && gridPosts.length > 0 && (
                        <div className="hidden lg:block">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 justify-center mt-8 sm:mt-10">
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
                                                alt={post.title || "Blog post"}
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
                                            </div>
                                            {/* Title */}
                                            <h3 className="text-2xl font-medium text-[#0F1D07] leading-[1.4] line-clamp-2" style={{ fontFamily: 'Poppins' }}>
                                                {post.title || 'Untitled post'}
                                            </h3>
                                            {/* Description */}
                                            {post.excerpt ? (
                                                <p className="text-lg text-[#666666] leading-[1.4] line-clamp-3" style={{ fontFamily: 'Poppins' }}>
                                                    {post.excerpt}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
