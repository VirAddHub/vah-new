"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, Share2, Loader2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "../app/blog/_components/mdx-components";
import { parseJsonSafe } from "@/lib/http";
import { formatBlogDate } from "@/lib/blog-date-formatter";

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

                let data: any;
                try {
                    data = await parseJsonSafe(response);
                } catch (err: any) {
                    console.error('[BlogPostPage] Blog request failed with non-JSON response:', err);
                    setError(`Failed to load blog post: ${err.message || 'Invalid response from server'}`);
                    setLoading(false);
                    return;
                }

                if (!response.ok || !data?.ok) {
                    setError(data?.error || 'Post not found');
                    setLoading(false);
                    return;
                }

                setPost(data.data);
            } catch (err: any) {
                console.error('Error fetching blog post:', err);
                setError(err.message || 'Failed to load blog post');
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
                    <div className="mb-8">
                        <h1 className="font-bold text-[clamp(1.75rem,4.5vw,3.5rem)] tracking-tight mb-6 text-foreground leading-tight">
                            {post.title}
                        </h1>

                        {/* Post Meta Information */}
                        <div className="text-sm text-muted-foreground space-y-1 mb-4">
                            {post.updated && post.updated !== post.date && (
                                <div>
                                    <span className="font-medium">Updated On:</span>{' '}
                                    {formatBlogDate(post.updated)}
                                </div>
                            )}
                            <div>
                                <span className="font-medium">Published:</span>{' '}
                                {formatBlogDate(post.date)}
                            </div>
                            <div>
                                <span className="font-medium">by</span>{' '}
                                <span>Liban Adan</span>
                                {post.tags && post.tags.length > 0 && (
                                    <>
                                        {' '}
                                        <span className="font-medium">in</span>{' '}
                                        <span>{post.tags[0]}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Read time and share */}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4">
                            {post.readTime && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {post.readTime}
                                </div>
                            )}
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
                            <div className="prose prose-lg max-w-none">
                                <MDXRemote source={post.content} components={mdxComponents} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Author Signature Block */}
                <div className="max-w-4xl mx-auto mt-10 pt-6 border-t border-border">
                    <footer className="flex items-center gap-4">
                        <img
                            src="/images/authors/liban.jpg"
                            alt="Liban Adan"
                            className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                            <p className="font-semibold">Liban Adan</p>
                            <p className="text-sm text-muted-foreground">
                                Founder, VirtualAddressHub
                            </p>
                        </div>
                    </footer>
                </div>

                {/* Article Footer */}
                <div className="max-w-4xl mx-auto mt-8 pt-8 border-t border-border">
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