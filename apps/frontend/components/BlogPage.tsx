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
    const title = post.title?.trim() || "Untitled post";
    const excerpt = post.excerpt?.trim();
    const category = post.category?.trim() || "Blog";
    const hasImage = !!post.imageUrl;

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
            className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
        >
            <div className="relative aspect-[16/9] w-full bg-muted">
                {hasImage ? (
                    <ImageWithFallback
                        src={post.imageUrl}
                        alt={title}
                        className="object-cover w-full h-full"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        quality={75}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-body-sm text-muted-foreground" aria-hidden="true">
                        No preview image
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-caption font-medium text-foreground">
                        {category}
                    </span>
                </div>
                <h2 className="text-h3 text-foreground line-clamp-2">
                    {title}
                </h2>
                {excerpt ? (
                    <p className="mt-2 text-body-sm text-muted-foreground line-clamp-3">
                        {excerpt}
                    </p>
                ) : null}
                <div className="mt-3 text-caption text-muted-foreground">
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

    // Fetch blog posts via BFF (same-origin) to avoid CORS and ensure posts load on frontend
    useEffect(() => {
        const fetchBlogPosts = async () => {
            try {
                const response = await fetch('/api/bff/blog/list');

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
        <div className="bg-background">
            {/* Hero Section — mobile-first, reduced top/bottom space */}
            <section className="bg-background">
                <div className="mx-auto max-w-6xl px-6 pt-10 pb-8 sm:pt-14 sm:pb-10 lg:px-8">
                    <div className="max-w-2xl">
                        <h1 className="text-h1 sm:text-display tracking-tight text-foreground">
                            Insights &amp; Resources for Modern Businesses
                        </h1>
                        <p className="mt-4 text-body sm:text-body-lg text-muted-foreground">
                            Expert advice, industry insights, and success stories to help you grow your business.
                        </p>
                    </div>
                    {/* Search Bar - desktop/tablet only */}
                    <div className="hidden lg:flex justify-center mt-6">
                        <div className="flex items-center gap-16 bg-muted rounded-full px-8 py-3.5 w-full max-w-[858px]">
                            <input
                                type="text"
                                placeholder="Search articles…"
                                className="flex-1 bg-transparent border-none outline-none text-body text-muted-foreground placeholder:text-muted-foreground"
                            />
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center cursor-pointer">
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
                                        <div className="relative w-full h-[238px] rounded-2xl overflow-hidden">
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
                                                <div className="bg-muted rounded-full px-2.5 py-0 flex items-center justify-center h-[34px]">
                                                    <span className="text-caption text-muted-foreground">
                                                        {post.category || 'Success Stories'}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Title */}
                                            <h3 className="text-h2 font-medium text-foreground line-clamp-2">
                                                {post.title || 'Untitled post'}
                                            </h3>
                                            {/* Description */}
                                            {post.excerpt ? (
                                                <p className="text-body-lg text-muted-foreground line-clamp-3">
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
                        <div className="text-center text-muted-foreground">
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
