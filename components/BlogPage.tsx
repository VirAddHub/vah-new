"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface BlogPageProps {
    onNavigate?: (page: string, data?: any) => void;
}

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

export function BlogPage({ onNavigate }: BlogPageProps) {
    const handleNavClick = (page: string, data?: any) => onNavigate?.(page, data);

    const blogPosts: BlogPost[] = [
        {
            id: 1,
            slug: "what-is-a-registered-office-address",
            title:
                "What is a Registered Office Address and Why Your UK Company Needs One",
            excerpt:
                "Every UK company must have a registered office address. Learn what it is, why it's required, and how to choose the right one for your business.",
            dateLong: "DD Month YYYY",
            dateShort: "DD Mon",
            readTime: "5 min read",
            category: "Company Formation",
            imageUrl:
                "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        },
        {
            id: 2,
            slug: "uk-company-formation-complete-guide",
            title: "UK Company Formation: A Complete Guide for 2024",
            excerpt:
                "Step-by-step guide to forming a UK company, including required documents, costs, and timeline. Everything you need to know to get started.",
            dateLong: "DD Month YYYY",
            dateShort: "DD Mon",
            readTime: "8 min read",
            category: "Business Setup",
            imageUrl:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBsYW5uaW5nJTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQxMTY1NXww&ixlib=rb-4.1.0&q=80&w=1080",
        },
        {
            id: 3,
            slug: "virtual-address-vs-postal-address",
            title:
                "Virtual Address vs Postal Address: What's the Difference?",
            excerpt:
                "Understanding the key differences between virtual addresses and traditional postal addresses for your business needs.",
            dateLong: "DD Month YYYY",
            dateShort: "DD Mon",
            readTime: "4 min read",
            category: "Virtual Addresses",
            imageUrl:
                "https://images.unsplash.com/photo-1586880244406-556ebe35f282?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWlsJTIwYm94JTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQxMTY1NXww&ixlib=rb-4.0&q=80&w=1080",
        },
    ];

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
            <div className="relative bg-gradient-to-b from-muted/30 to-background py-20 lg:py-28">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="font-serif text-5xl lg:text-6xl tracking-tight mb-6 text-primary">
                            Business Knowledge Hub
                        </h1>
                        <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                            Expert guidance on UK company formation, virtual
                            addresses, and business compliance. Stay informed
                            with the latest updates and best practices.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-14">
                {/* Featured Post */}
                {featuredPost ? (
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
                                    asChild
                                    variant="outline"
                                    className="w-fit px-6 py-2"
                                    aria-label={`Read article: ${featuredPost.title}`}
                                >
                                    <Link href={`/blog/${featuredPost.slug}`}>
                                        Read Article
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
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
                {gridPosts.length > 0 && (
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
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        aria-label={`Read article: ${post.title}`}
                                    >
                                        <Link href={`/blog/${post.slug}`}>
                                            Read More
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
