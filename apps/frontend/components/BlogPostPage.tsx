"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, Share2, Loader2, User, Tag } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface BlogPostPageProps {
    slug: string;
    onNavigate?: (page: string, data?: any) => void;
    onBack?: () => void;
}

export function BlogPostPage({ slug, onNavigate, onBack }: BlogPostPageProps) {
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch blog post from API
    useEffect(() => {
        const fetchBlogPost = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
                const response = await fetch(`${apiUrl}/api/blog/posts/${slug}`);
                const data = await response.json();

                if (data.ok) {
                    setPost(data.data);
                } else {
                    setError('Post not found');
                }
            } catch (err) {
                console.error('Error fetching blog post:', err);
                setError('Failed to load blog post');
            } finally {
                setLoading(false);
            }
        };

        fetchBlogPost();
    }, [slug]);

    // Add structured data for individual blog posts
    const generateStructuredData = (post: any) => ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.description,
        "url": `https://virtualaddresshub.com/blog/${slug}`,
        "datePublished": post.date,
        "dateModified": post.updated || post.date,
        "author": {
            "@type": "Organization",
            "name": "VirtualAddressHub",
            "url": "https://virtualaddresshub.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": "VirtualAddressHub",
            "url": "https://virtualaddresshub.com",
            "logo": {
                "@type": "ImageObject",
                "url": "https://virtualaddresshub.com/images/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://virtualaddresshub.com/blog/${slug}`
        },
        "image": post.cover,
        "articleSection": post.tags?.[0] || "General",
        "wordCount": post.content?.split(' ').length || 0,
        "timeRequired": post.readTime
    });

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container-modern py-24">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading blog post...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !post) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container-modern py-24">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-muted rounded-2xl mx-auto mb-6 flex items-center justify-center">
                            <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h1 className="text-4xl font-bold mb-6 text-gradient">Blog Post Not Found</h1>
                        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
                            {error || "The blog post you're looking for doesn't exist."}
                        </p>
                        <Button
                            onClick={onBack}
                            className="btn-primary"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Blog
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="container-modern py-4">
                    <Button
                        onClick={onBack}
                        variant="ghost"
                        className="btn-outline"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Blog
                    </Button>
                </div>
            </div>

            {/* Hero Section */}
            <section className="section-padding bg-gradient-to-b from-background to-muted/30">
                <div className="container-modern">
                    <div className="max-w-4xl mx-auto">
                        {/* Meta Information */}
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                <Tag className="w-3 h-3 mr-1" />
                                {post.tags?.[0] || 'General'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {post.dateLong || post.date}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {post.readTime || '5 min read'}
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-balance">
                            {post.title}
                        </h1>

                        {/* Description */}
                        {post.description && (
                            <p className="text-xl text-muted-foreground mb-8 leading-relaxed text-balance">
                                {post.description}
                            </p>
                        )}

                        {/* Author */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold">VirtualAddressHub</p>
                                <p className="text-sm text-muted-foreground">Business Address Experts</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Image */}
            {post.cover && (
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative rounded-2xl overflow-hidden shadow-modern-lg">
                                <ImageWithFallback
                                    src={post.cover}
                                    alt={post.title}
                                    className="aspect-[16/9] w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Content */}
            <section className="section-padding">
                <div className="container-modern">
                    <div className="max-w-4xl mx-auto">
                        <Card className="card-modern p-8 lg:p-12">
                            <CardContent className="prose prose-lg max-w-none">
                                <div
                                    className="text-muted-foreground leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: post.content }}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
                <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
                    <div className="container-modern">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center">
                                <h3 className="text-xl font-semibold mb-6">Tags</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {post.tags.map((tag: string, index: number) => (
                                        <Badge key={index} variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Share Section */}
            <section className="section-padding">
                <div className="container-modern">
                    <div className="max-w-4xl mx-auto">
                        <Card className="card-modern p-8 text-center">
                            <h3 className="text-xl font-semibold mb-4">Share This Article</h3>
                            <p className="text-muted-foreground mb-6">
                                Help others discover this valuable content about UK business addresses.
                            </p>
                            <div className="flex justify-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: post.title,
                                                text: post.description,
                                                url: window.location.href,
                                            });
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                        }
                                    }}
                                    className="btn-outline"
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                                <Button
                                    onClick={() => onNavigate?.('blog')}
                                    className="btn-primary"
                                >
                                    Read More Articles
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateStructuredData(post)) }}
            />
        </div>
    );
}