"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, Share2, Loader2 } from "lucide-react";
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
            <div className="min-h-screen bg-background py-12">
                <div className="container mx-auto px-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading blog post...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !post) {
        return (
            <div className="min-h-screen bg-background py-12">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="font-bold text-[clamp(1.75rem,4.5vw,3.5rem)] tracking-tight mb-6">Blog Post Not Found</h1>
                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                        {error || "The blog post you're looking for doesn't exist."}
                    </p>
                    <Button onClick={onBack} variant="outline" className="px-6 py-3 bg-background/90 backdrop-blur-sm border-border hover:bg-accent hover:border-primary/20 text-foreground shadow-sm hover:shadow-md transition-all duration-200">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Blog
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="mb-8">
                    <Button
                        onClick={onBack}
                        variant="outline"
                        className="px-4 py-2 bg-background/90 backdrop-blur-sm border-border hover:bg-accent hover:border-primary/20 text-foreground shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Blog
                    </Button>
                </div>

                {/* Article Header */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="text-center mb-8">
                        {post.tags && post.tags.length > 0 && (
                            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
                                {post.tags[0]}
                            </Badge>
                        )}
                        <h1 className="font-bold text-[clamp(1.75rem,4.5vw,3.5rem)] tracking-tight mb-6 text-foreground leading-tight">
                            {post.title}
                        </h1>
                        <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-3xl mx-auto">
                            {post.description}
                        </p>
                        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {post.dateLong}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {post.readTime}
                            </div>
                            <Button variant="ghost" size="sm" className="gap-2">
                                <Share2 className="h-4 w-4" />
                                Share
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Featured Image */}
                {post.cover && (
                    <div className="max-w-4xl mx-auto mb-12">
                        <div className="relative h-64 lg:h-96 rounded-lg overflow-hidden">
                            <ImageWithFallback
                                src={post.cover}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}

                {/* Article Content */}
                <div className="max-w-4xl mx-auto">
                    <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="px-0">
                            <div
                                className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Article Footer */}
                <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={onBack}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Blog
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Share2 className="h-4 w-4" />
                            Share Article
                        </Button>
                    </div>
                </div>
            </div>

            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateStructuredData(post))
                }}
            />
        </div>
    );
}