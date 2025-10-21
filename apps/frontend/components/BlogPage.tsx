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
import { Calendar, Clock, ArrowRight, Loader2, Search, Filter } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { BlogCardSkeleton } from "./ui/skeleton";

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
    const [searchTerm, setSearchTerm] = useState('');

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

    // Filter posts based on search term
    const filteredPosts = useMemo(() => {
        if (!searchTerm) return blogPosts;
        return blogPosts.filter(post =>
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [blogPosts, searchTerm]);

    // Always show the first post as featured (latest) and others in the grid
    const featuredPost = useMemo(
        () => filteredPosts[0] ?? null,
        [filteredPosts],
    );

    const gridPosts = useMemo(() => {
        if (!featuredPost) return [];
        return filteredPosts.filter((p) => p.id !== featuredPost.id);
    }, [filteredPosts, featuredPost]);

    const handlePostClick = (post: BlogPost) => {
        if (onNavigate) {
            onNavigate('blog-post', { slug: post.slug });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                {/* Header Skeleton */}
                <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
                    <div className="container-modern py-4">
                        <div className="flex items-center justify-between">
                            <div className="h-8 w-24 bg-muted/50 rounded-lg animate-pulse"></div>
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-64 bg-muted/50 rounded-lg animate-pulse"></div>
                                <div className="h-10 w-20 bg-muted/50 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Section Skeleton */}
                <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                    <div className="container-modern">
                        <div className="text-center mb-16">
                            <div className="h-16 w-16 bg-muted/50 rounded-2xl mx-auto mb-6 animate-pulse"></div>
                            <div className="h-12 w-96 bg-muted/50 rounded-lg mx-auto mb-6 animate-pulse"></div>
                            <div className="h-6 w-2/3 bg-muted/50 rounded-lg mx-auto mb-8 animate-pulse"></div>
                            <div className="h-12 w-80 bg-muted/50 rounded-lg mx-auto animate-pulse"></div>
                        </div>
                    </div>
                </section>

                {/* Featured Post Skeleton */}
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="max-w-6xl mx-auto">
                            <div className="h-8 w-48 bg-muted/50 rounded-lg mx-auto mb-8 animate-pulse"></div>
                            <div className="card-modern p-8 mb-16">
                                <div className="grid gap-8 lg:grid-cols-2">
                                    <div className="h-64 bg-muted/50 rounded-xl animate-pulse"></div>
                                    <div className="space-y-4">
                                        <div className="h-8 w-3/4 bg-muted/50 rounded-lg animate-pulse"></div>
                                        <div className="h-4 w-full bg-muted/50 rounded animate-pulse"></div>
                                        <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse"></div>
                                        <div className="flex items-center gap-4 mt-6">
                                            <div className="h-6 w-20 bg-muted/50 rounded-full animate-pulse"></div>
                                            <div className="h-4 w-24 bg-muted/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-16 bg-muted/50 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blog Grid Skeleton */}
                <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
                    <div className="container-modern">
                        <div className="max-w-6xl mx-auto">
                            <div className="h-8 w-48 bg-muted/50 rounded-lg mx-auto mb-12 animate-pulse"></div>
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <BlogCardSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="text-center py-12">
                            <p className="text-destructive">{error}</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Editorial Header */}
            <div className="relative bg-gradient-to-b from-muted/30 to-background section-padding">
                <div className="container-modern">
                    <div className="text-center mb-16">
                        <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
                            Business <span className="text-gradient">Insights & Guides</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance mb-8">
                            Expert insights on virtual business addresses, UK company formation, HMRC compliance, and mail forwarding services.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-md mx-auto relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Post */}
            {featuredPost && (
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold mb-8 text-center">
                                <span className="text-gradient">Featured Article</span>
                            </h2>

                            <article
                                className="blog-card cursor-pointer group"
                                onClick={() => handlePostClick(featuredPost)}
                            >
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <div className="relative">
                                        <ImageWithFallback
                                            src={featuredPost.imageUrl}
                                            alt={featuredPost.title}
                                            className="aspect-[4/3] w-full rounded-2xl object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                                            Featured
                                        </Badge>
                                    </div>

                                    <div className="p-8 flex flex-col justify-center">
                                        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                                            <Badge variant="secondary">{featuredPost.category}</Badge>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {featuredPost.dateLong}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {featuredPost.readTime}
                                            </div>
                                        </div>

                                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                                            {featuredPost.title}
                                        </h3>

                                        <p className="text-muted-foreground mb-6 leading-relaxed">
                                            {featuredPost.excerpt}
                                        </p>

                                        <Button
                                            variant="outline"
                                            className="btn-outline w-fit group-hover:bg-primary group-hover:text-primary-foreground"
                                        >
                                            Read More
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            )}

            {/* Blog Grid */}
            {gridPosts.length > 0 && (
                <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                    <div className="container-modern">
                        <h2 className="text-2xl font-bold mb-12 text-center">
                            <span className="text-gradient">All Articles</span>
                        </h2>

                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {gridPosts.map((post) => (
                                <article
                                    key={post.id}
                                    className="blog-card cursor-pointer group"
                                    onClick={() => handlePostClick(post)}
                                >
                                    <div className="relative">
                                        <ImageWithFallback
                                            src={post.imageUrl}
                                            alt={post.title}
                                            className="aspect-[4/3] w-full rounded-t-2xl object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">
                                            {post.category}
                                        </Badge>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {post.dateShort}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {post.readTime}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>

                                        <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                                            {post.excerpt}
                                        </p>

                                        <Button
                                            variant="ghost"
                                            className="p-0 h-auto text-primary hover:text-primary group-hover:translate-x-1 transition-all duration-200"
                                        >
                                            Read More
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* No Results */}
            {filteredPosts.length === 0 && searchTerm && (
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                            <p className="text-muted-foreground mb-4">
                                Try adjusting your search terms or browse all articles.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setSearchTerm('')}
                                className="btn-outline"
                            >
                                Clear Search
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
            />
        </div>
    );
}