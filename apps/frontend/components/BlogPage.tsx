'use client';

import { useMemo, useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
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
                const data = await response.json();

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

    // Always show the first post as featured (latest) and others in the grid
    const featuredPost = useMemo(
        () => blogPosts[0] ?? null,
        [blogPosts],
    );

    const gridPosts = useMemo(() => {
        if (!featuredPost) return [];
        return blogPosts.filter((p) => p.id !== featuredPost.id);
    }, [blogPosts, featuredPost]);

    return (
        <div className="min-h-screen bg-background">
            {/* Editorial Header */}
            <div className="relative bg-gradient-to-b from-muted/30 to-background py-12 lg:py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6 text-[#1e3a8a]">
                            Virtual Business Address & UK Compliance Blog
                        </h1>
                        <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                            Expert insights on virtual business addresses, UK company formation,
                            HMRC compliance, and mail forwarding services. Stay informed with
                            the latest industry updates and best practices for your business.
                        </p>
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

            <div className="container mx-auto px-4 py-14">
                {/* Featured Post */}
                {!loading && !error && featuredPost ? (
                    <Card className="mb-16 overflow-hidden shadow-sm border border-border bg-card">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="relative h-72 lg:h-auto">
                                <ImageWithFallback
                                    src={featuredPost.imageUrl}
                                    alt={featuredPost.title}
                                    className="w-full h-full object-cover"
                                />
                                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                                    Featured
                                </Badge>
                            </div>
                            <div className="p-8 lg:p-10 flex flex-col justify-center">
                                <Badge
                                    variant="secondary"
                                    className="w-fit mb-3 px-3 py-1 text-xs"
                                >
                                    {featuredPost.category}
                                </Badge>
                                <h2 className="font-serif text-2xl lg:text-3xl tracking-tight mb-4 text-foreground leading-tight">
                                    {featuredPost.title}
                                </h2>
                                <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                                    {featuredPost.excerpt}
                                </p>
                                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {
                                            featuredPost.dateLong /* placeholder label */
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        {featuredPost.readTime}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-fit px-6 py-2"
                                    aria-label={`Read article: ${featuredPost.title}`}
                                    onClick={() => onNavigate?.('blog-post', { slug: featuredPost.slug })}
                                >
                                    Read Article
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="text-center text-muted-foreground mb-16">
                        No posts found.
                    </div>
                )}

                {/* Blog Posts Grid */}
                {!loading && !error && gridPosts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                        {gridPosts.map((post) => (
                            <Card
                                key={post.id}
                                className="overflow-hidden hover:shadow-md transition-all duration-300 border border-border bg-card"
                            >
                                <div className="relative h-48">
                                    <ImageWithFallback
                                        src={post.imageUrl}
                                        alt={post.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <CardHeader className="p-6">
                                    <Badge
                                        variant="secondary"
                                        className="w-fit mb-2 px-3 py-1 text-[11px]"
                                    >
                                        {post.category}
                                    </Badge>
                                    <CardTitle className="font-serif text-lg leading-tight line-clamp-2">
                                        {post.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    <p className="text-sm text-muted-foreground mb-5 line-clamp-3 leading-relaxed">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-5">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {post.dateShort /* placeholder label */}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            {post.readTime}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        aria-label={`Read article: ${post.title}`}
                                        onClick={() => onNavigate?.('blog-post', { slug: post.slug })}
                                    >
                                        Read More
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
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
