'use client';

import { useMemo, useEffect, useState } from "react";

type BlogPost = {
    id: number | string;
    slug: string;
    title: string;
    excerpt: string;
    dateLong: string;
    dateShort: string;
    readTime: string;
    category: string;
    imageUrl: string;
};

interface BlogPageProps {
    onNavigate?: (page: string, data?: any) => void;
    initialPosts?: BlogPost[];
}

export function BlogPage({ onNavigate, initialPosts }: BlogPageProps) {
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>(initialPosts ?? []);
    const [loading, setLoading] = useState(!initialPosts);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // If initialPosts were provided by the server, skip client fetch
        if (initialPosts && initialPosts.length >= 0) return;

        const fetchBlogPosts = async () => {
            try {
                const response = await fetch('/api/bff/blog/list');
                const contentType = response.headers.get("content-type") || "";
                if (!contentType.toLowerCase().includes("application/json")) {
                    setError('Failed to load posts');
                    setLoading(false);
                    return;
                }
                const data = await response.json();
                if (data.ok) {
                    setBlogPosts(data.data);
                } else {
                    setError('Failed to load posts');
                }
            } catch (err) {
                setError('Failed to load posts');
            } finally {
                setLoading(false);
            }
        };
        fetchBlogPosts();
    }, []);

    const filteredPosts = useMemo(() => {
        if (!searchQuery.trim()) return blogPosts;
        const q = searchQuery.toLowerCase();
        return blogPosts.filter(p =>
            p.title?.toLowerCase().includes(q) ||
            p.excerpt?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        );
    }, [blogPosts, searchQuery]);

    const featuredPost = filteredPosts[0] ?? null;
    const gridPosts = filteredPosts.slice(1);

    const blogStructuredData = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "VirtualAddressHub — The Bulletin",
        "description": "Honest writing about running a UK business.",
        "url": "https://virtualaddresshub.co.uk/blog",
        "publisher": { "@type": "Organization", "name": "VirtualAddressHub" },
        "blogPost": blogPosts.map(post => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "url": `https://virtualaddresshub.co.uk/blog/${post.slug}`,
            "datePublished": post.dateLong,
        }))
    }), [blogPosts]);

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
            <style>{`
                .blog-search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-family: 'Inter', sans-serif;
                    font-size: 16px;
                    font-style: normal;
                    color: hsl(var(--ink));
                }
                .blog-search-input::placeholder {
                    color: hsl(var(--slate));
                    font-style: normal;
                }
                .featured-post-link {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    gap: 48px;
                    padding: 40px 0;
                    border-top: 1px solid hsl(var(--line));
                    border-bottom: 1px solid hsl(var(--line));
                    margin-bottom: 56px;
                    text-decoration: none;
                    cursor: pointer;
                    align-items: center;
                }
                .featured-post-link:hover .blog-read-link {
                    opacity: 0.7;
                }
                .featured-post-link:hover .featured-title {
                    color: hsl(var(--ink));
                }
                .featured-title { transition: color 0.15s; }
                .blog-grid-item {
                    padding: 36px 0;
                    text-decoration: none;
                    cursor: pointer;
                    display: block;
                }
                .blog-grid-item:hover .blog-grid-title {
                    color: hsl(var(--ink));
                }
                .blog-grid-title { transition: color 0.15s; }
                .blog-read-link {
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(var(--ink));
                    border-bottom: 1px solid hsl(var(--ink));
                    padding-bottom: 2px;
                    text-decoration: none;
                    display: inline-block;
                    transition: opacity 0.15s;
                }
                @media (max-width: 768px) {
                    .featured-post-link {
                        grid-template-columns: 1fr !important;
                        gap: 24px !important;
                    }
                    .blog-post-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .blog-post-grid .blog-grid-item {
                        border-right: none !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                        border-top: 1px solid hsl(var(--line)) !important;
                    }
                    .blog-post-grid .blog-grid-item:first-child {
                        border-top: none !important;
                    }
                }
            `}</style>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
            />

            {/* Page header */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,56px) 0' }}>
                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 'clamp(32px,6vw,68px)',
                    fontWeight: 600,
                    color: 'hsl(var(--ink))',
                    margin: '0 0 18px',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.05,
                }}>
                    Helpful notes for{' '}
                    <em style={{ fontStyle: 'normal', color: 'hsl(var(--slate))' }}>running a UK business.</em>
                </h1>

                <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 'clamp(14px,2vw,19px)',
                    color: 'hsl(var(--graphite))',
                    margin: '0 0 36px',
                    maxWidth: '620px',
                    lineHeight: 1.55,
                    fontWeight: 400,
                }}>
                    Simple, practical advice, honest lessons and things we wish we'd known earlier — written for founders, freelancers and small business owners.
                </p>

                {/* Search bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: '#FFFFFF',
                    border: '1px solid hsl(var(--line))',
                    padding: '14px 20px',
                    borderRadius: '4px',
                    marginBottom: '56px',
                    maxWidth: '640px',
                }}>
                    <span style={{
                        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                        fontSize: '11px',
                        color: 'hsl(var(--slate))',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                    }}>Search</span>
                    <input
                        className="blog-search-input"
                        placeholder="Search the bulletin…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <span style={{
                        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                        fontSize: '11px',
                        color: 'hsl(var(--slate))',
                        flexShrink: 0,
                    }}>⏎</span>
                </div>
            </div>

            {/* Posts section */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(20px,5vw,56px) clamp(60px,8vw,110px)' }}>

                {/* Loading */}
                {loading && (
                    <div style={{ padding: '60px 0', textAlign: 'center', color: 'hsl(var(--slate))', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                        Loading posts…
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <p style={{ color: 'hsl(var(--slate))', fontFamily: "'Inter', sans-serif", fontSize: '14px', marginBottom: '16px' }}>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'none', border: '1px solid hsl(var(--line))', borderRadius: '4px',
                                padding: '8px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                fontSize: '13px', color: 'hsl(var(--graphite))',
                            }}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && filteredPosts.length === 0 && (
                    <div style={{ padding: '60px 0', textAlign: 'center', color: 'hsl(var(--slate))', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                        {searchQuery ? `No posts matching "${searchQuery}"` : 'No posts yet.'}
                    </div>
                )}

                {/* Featured post */}
                {!loading && !error && featuredPost && (
                    <div
                        className="featured-post-link"
                        onClick={() => onNavigate?.('blog-post', { slug: featuredPost.slug })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') onNavigate?.('blog-post', { slug: featuredPost.slug }); }}
                    >
                        {/* Cover */}
                        <div style={{
                            aspectRatio: '4/3',
                            background: 'hsl(var(--mist))',
                            backgroundImage: `repeating-linear-gradient(45deg, #E5E5E540 0 1px, transparent 1px 16px)`,
                            display: 'grid',
                            placeItems: 'center',
                            position: 'relative',
                            border: '1px solid hsl(var(--line))',
                            overflow: 'hidden',
                            borderRadius: '2px',
                        }}>
                            {featuredPost.imageUrl ? (
                                <img
                                    src={featuredPost.imageUrl}
                                    alt={featuredPost.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                                />
                            ) : (
                                <div style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: '11px',
                                    color: 'hsl(var(--slate))',
                                    letterSpacing: '0.1em',
                                    textAlign: 'center',
                                    padding: '24px',
                                    lineHeight: 1.7,
                                }}>
                                    [ COVER · drop in<br />a typographic<br />illustration ]
                                </div>
                            )}
                            {/* Featured badge */}
                            <div style={{
                                position: 'absolute', top: '16px', left: '16px',
                                background: '#B42318', color: '#FFFFFF',
                                padding: '4px 12px',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '10px',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                            }}>Featured</div>
                        </div>

                        {/* Copy */}
                        <div>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                                fontSize: '11px',
                                color: 'hsl(var(--slate))',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                marginBottom: '18px',
                                flexWrap: 'wrap',
                            }}>
                                <span style={{ color: 'hsl(var(--ink))', fontWeight: 500 }}>{featuredPost.category}</span>
                                <span>·</span>
                                <span>{featuredPost.dateLong}</span>
                                <span>·</span>
                                <span>{featuredPost.readTime}</span>
                            </div>

                            <h2 className="featured-title" style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: 'clamp(24px,3.5vw,42px)',
                                color: 'hsl(var(--ink))',
                                margin: '0 0 16px',
                                letterSpacing: '-0.02em',
                                fontWeight: 600,
                                lineHeight: 1.1,
                            }}>
                                {featuredPost.title}
                            </h2>

                            {featuredPost.excerpt && (
                                <p style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 'clamp(14px,1.8vw,17px)',
                                    color: 'hsl(var(--graphite))',
                                    lineHeight: 1.6,
                                    margin: '0 0 24px',
                                    fontWeight: 400,
                                }}>
                                    {featuredPost.excerpt}
                                </p>
                            )}

                            <span className="blog-read-link">Read article →</span>
                        </div>
                    </div>
                )}

                {/* Grid */}
                {!loading && !error && gridPosts.length > 0 && (
                    <div className="blog-post-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
                        {gridPosts.map((post, i) => (
                            <div
                                key={post.id}
                                className="blog-grid-item"
                                onClick={() => onNavigate?.('blog-post', { slug: post.slug })}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter') onNavigate?.('blog-post', { slug: post.slug }); }}
                                style={{
                                    borderTop: i >= 2 ? '1px solid hsl(var(--line))' : 'none',
                                    borderRight: i % 2 === 0 ? '1px solid hsl(var(--line))' : 'none',
                                    paddingRight: i % 2 === 0 ? '36px' : '0',
                                    paddingLeft: i % 2 === 1 ? '36px' : '0',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                                    fontSize: '11px',
                                    color: 'hsl(var(--slate))',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    marginBottom: '14px',
                                    flexWrap: 'wrap',
                                }}>
                                    <span style={{ color: 'hsl(var(--ink))', fontWeight: 500 }}>{post.category}</span>
                                    <span>·</span>
                                    <span>{post.dateLong}</span>
                                </div>

                                <h3 className="blog-grid-title" style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 'clamp(18px,2.2vw,24px)',
                                    color: 'hsl(var(--ink))',
                                    margin: '0 0 10px',
                                    letterSpacing: '-0.015em',
                                    fontWeight: 600,
                                    lineHeight: 1.2,
                                }}>
                                    {post.title}
                                </h3>

                                {post.excerpt && (
                                    <p style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: 'clamp(13px,1.5vw,15px)',
                                        color: 'hsl(var(--graphite))',
                                        lineHeight: 1.6,
                                        margin: '0 0 14px',
                                        fontWeight: 400,
                                    }}>
                                        {post.excerpt}
                                    </p>
                                )}

                                <span style={{
                                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                                    fontSize: '11px',
                                    color: 'hsl(var(--slate))',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                }}>
                                    {post.readTime}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
