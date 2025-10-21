"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Calendar, Clock, Share2, Loader2, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { FAQSchema, getFAQSet } from "./FAQSchema";

interface BlogPostPageProps {
    slug: string;
    onNavigate?: (page: string, data?: any) => void;
    onBack?: () => void;
}

export function BlogPostPage({ slug, onNavigate, onBack }: BlogPostPageProps) {
    const [post, setPost] = useState<any>(null);
    const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
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
                    // Fetch related posts
                    await fetchRelatedPosts(data.data.tags || []);
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

    // Fetch related posts based on tags
    const fetchRelatedPosts = async (tags: string[]) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
            const response = await fetch(`${apiUrl}/api/blog/posts`);
            const data = await response.json();

            if (data.ok) {
                // Filter posts with similar tags, excluding current post
                const related = data.data
                    .filter((p: any) => p.slug !== slug && p.status === 'published')
                    .filter((p: any) => p.tags && p.tags.some((tag: string) => tags.includes(tag)))
                    .slice(0, 3); // Limit to 3 related posts

                setRelatedPosts(related);
            }
        } catch (err) {
            console.error('Error fetching related posts:', err);
        }
    };

    // Add structured data for individual blog posts
    const generateStructuredData = (post: any) => ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.description,
        "url": `https://virtualaddresshub.com/blog/${post.slug}`,
        "datePublished": post.dateLong,
        "dateModified": post.updated || post.dateLong,
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
            "@id": `https://virtualaddresshub.com/blog/${post.slug}`
        },
        "keywords": post.tags?.join(', ') || '',
        "articleSection": post.tags?.[0] || 'Business',
        "wordCount": post.content?.split(' ').length || 0
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading blog post...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
                    <p className="text-muted-foreground mb-6">{error || 'The requested blog post could not be found.'}</p>
                    <Button onClick={onBack} variant="outline">
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

                {/* Internal Links Section */}
                <div className="max-w-4xl mx-auto mt-16">
                    <div className="bg-muted/30 rounded-lg p-8">
                        <h2 className="text-2xl font-semibold mb-6 text-foreground">Explore More</h2>
                        <div className="grid gap-4">
                            <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" />
                                <div>
                                    <a
                                        href="/pricing"
                                        className="text-primary hover:underline font-medium"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate?.('pricing');
                                        }}
                                    >
                                        View Our Pricing Plans
                                    </a>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        See our competitive pricing for virtual business addresses
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" />
                                <div>
                                    <a
                                        href="/about"
                                        className="text-primary hover:underline font-medium"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate?.('about');
                                        }}
                                    >
                                        Learn About VirtualAddressHub
                                    </a>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Discover why 1000+ businesses trust us with their address needs
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" />
                                <div>
                                    <a
                                        href="/help"
                                        className="text-primary hover:underline font-medium"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate?.('help');
                                        }}
                                    >
                                        Get Help & Support
                                    </a>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Find answers to common questions about our services
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section - Show relevant FAQs based on post tags */}
                {post.tags && post.tags.some((tag: string) =>
                    ['virtual-address', 'company-formation', 'mail-forwarding'].includes(tag.toLowerCase())
                ) && (
                        <div className="max-w-4xl mx-auto mt-12">
                            <FAQSchema
                                faqs={getFAQSet(post.tags.find((tag: string) =>
                                    ['virtual-address', 'company-formation', 'mail-forwarding'].includes(tag.toLowerCase())
                                )?.toLowerCase() || 'virtual-address')}
                            />
                        </div>
                    )}

                {/* Related Posts Section */}
                {relatedPosts.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-12">
                        <h2 className="text-2xl font-semibold mb-6 text-foreground">You Might Also Like</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {relatedPosts.map((relatedPost) => (
                                <Card key={relatedPost.slug} className="hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="space-y-3">
                                            {relatedPost.tags && relatedPost.tags.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {relatedPost.tags[0]}
                                                </Badge>
                                            )}
                                            <h3 className="font-semibold text-lg leading-tight">
                                                <a
                                                    href={`/blog/${relatedPost.slug}`}
                                                    className="text-foreground hover:text-primary transition-colors"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onNavigate?.('blog-post', { slug: relatedPost.slug });
                                                    }}
                                                >
                                                    {relatedPost.title}
                                                </a>
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {relatedPost.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {relatedPost.dateLong}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

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