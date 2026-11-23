"use client";

import { useState, useEffect } from "react";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import { mdxComponents } from "../app/blog/_components/mdx-components";
import { parseJsonSafe } from "@/lib/http";

interface BlogPostPageProps {
    slug: string;
    onNavigate?: (page: string, data?: any) => void;
    onBack?: () => void;
}

export function BlogPostPage({ slug, onNavigate, onBack }: BlogPostPageProps) {
    const [post, setPost] = useState<any>(null);
    const [mdxSerialized, setMdxSerialized] = useState<MDXRemoteSerializeResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchBlogPost = async () => {
            setLoading(true);
            setError(null);
            setPost(null);
            setMdxSerialized(null);

            try {
                // Use BFF route — never call backend directly from browser
                const response = await fetch(`/api/bff/blog/detail?slug=${encodeURIComponent(slug)}`);

                let data: any;
                try {
                    data = await parseJsonSafe(response);
                } catch (err: any) {
                    if (!cancelled) setError('Failed to load post');
                    return;
                }

                if (!response.ok || !data?.ok) {
                    if (!cancelled) setError(data?.error || 'Post not found');
                    return;
                }

                const postData = data.data;
                const content = typeof postData?.content === 'string' ? postData.content : '';

                const compileRes = await fetch('/api/blog/compile-mdx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: content }),
                });

                if (cancelled) return;

                if (!compileRes.ok) {
                    const errBody = await compileRes.json().catch(() => ({}));
                    if (!cancelled) setError(typeof errBody?.error === 'string' ? errBody.error : 'Failed to render article');
                    return;
                }

                const serialized = (await compileRes.json()) as MDXRemoteSerializeResult;
                if (!cancelled) {
                    setPost(postData);
                    setMdxSerialized(serialized);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Failed to load post');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchBlogPost();
        return () => { cancelled = true; };
    }, [slug]);

    const structuredData = post ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.description,
        "url": `https://virtualaddresshub.co.uk/blog/${slug}`,
        "datePublished": post.date,
        "dateModified": post.updated || post.date,
        "author": { "@type": "Person", "name": post.authorName || "Liban Adan" },
        "publisher": { "@type": "Organization", "name": "VirtualAddressHub" },
        "image": post.cover,
        "articleSection": post.tags?.[0] || "General",
    } : null;

    // Loading
    if (loading) {
        return (
            <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FFFFFF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '32px', height: '32px', border: '2px solid #E5E5E5',
                        borderTopColor: '#0A0A0A', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                    }} />
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#6B6B6B' }}>Loading…</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // Error
    if (error || !post || !mdxSerialized) {
        return (
            <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FFFFFF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', color: '#0A0A0A', marginBottom: '8px' }}>Post not found</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#6B6B6B', marginBottom: '24px' }}>{error || "This article doesn't exist."}</p>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none', border: '1px solid #E5E5E5', borderRadius: '4px',
                            padding: '10px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            fontSize: '13px', color: '#0A0A0A',
                        }}
                    >
                        ← Back to blog
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
            <style>{`
                .post-body { font-family: 'Inter', sans-serif; font-size: clamp(15px, 2vw, 17px); color: #404040; line-height: 1.8; }
                .post-body h1, .post-body h2, .post-body h3, .post-body h4 {
                    font-family: 'Inter', sans-serif; color: #0A0A0A; font-weight: 600;
                    letter-spacing: -0.02em; margin: 1.8em 0 0.6em; line-height: 1.2;
                }
                .post-body h1 { font-size: clamp(24px,3vw,32px); }
                .post-body h2 { font-size: clamp(20px,2.5vw,26px); }
                .post-body h3 { font-size: clamp(17px,2vw,21px); }
                .post-body p { margin: 0 0 1.2em; }
                .post-body ul, .post-body ol { padding-left: 22px; margin: 0 0 1.2em; }
                .post-body li { margin-bottom: 6px; }
                .post-body strong { color: #0A0A0A; font-weight: 600; }
                .post-body a { color: #0A0A0A; text-decoration: underline; }
                .post-body a:hover { opacity: 0.75; }
                .post-body blockquote {
                    border-left: 3px solid #0A0A0A; margin: 1.5em 0; padding: 4px 0 4px 20px;
                    color: #6B6B6B; font-style: normal;
                }
                .post-body code {
                    background: #F5F5F5; padding: 2px 6px; border-radius: 3px;
                    font-family: 'IBM Plex Mono', monospace; font-size: 0.88em;
                }
                .post-body pre {
                    background: #0A0A0A; color: #FFFFFF; padding: 20px; border-radius: 6px;
                    overflow-x: auto; margin: 1.5em 0;
                }
                .post-body pre code { background: none; padding: 0; color: inherit; }
                .post-body hr { border: none; border-top: 1px solid #E5E5E5; margin: 2.5em 0; }
                .post-body img { max-width: 100%; border-radius: 4px; margin: 1em 0; }
                .back-btn { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif; font-size: 13px; color: #6B6B6B; padding: 0; transition: color 0.15s; }
                .back-btn:hover { color: #0A0A0A; }
                @media (max-width: 768px) { .post-inner { padding: 0 clamp(20px,5vw,40px) !important; } }
            `}</style>

            {structuredData && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            )}

            <div className="post-inner" style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,40px) clamp(60px,8vw,100px)' }}>

                {/* Back link */}
                <button className="back-btn" onClick={onBack} style={{ marginBottom: '40px' }}>
                    <span style={{ fontSize: '16px' }}>←</span>
                    <span>Back to blog</span>
                </button>

                {/* Meta row */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                    fontSize: '11px', color: '#6B6B6B',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    marginBottom: '20px',
                }}>
                    {post.tags?.[0] && (
                        <>
                            <span style={{ color: '#0A0A0A', fontWeight: 500 }}>{post.tags[0]}</span>
                            <span>·</span>
                        </>
                    )}
                    <span>{post.dateLong || new Date(post.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    {post.readTime && <><span>·</span><span>{post.readTime}</span></>}
                </div>

                {/* Title */}
                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 'clamp(26px,4vw,44px)',
                    fontWeight: 600,
                    color: '#0A0A0A',
                    margin: '0 0 20px',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.1,
                }}>
                    {post.title}
                </h1>

                {/* Excerpt / description */}
                {post.description && (
                    <p style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 'clamp(15px,2vw,18px)',
                        color: '#6B6B6B',
                        margin: '0 0 32px',
                        lineHeight: 1.55,
                        fontWeight: 400,
                    }}>
                        {post.description}
                    </p>
                )}

                {/* Cover image */}
                {post.cover && (
                    <div style={{ margin: '0 0 40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E5E5' }}>
                        <img src={post.cover} alt={post.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                    </div>
                )}

                {/* Hairline */}
                <div style={{ borderTop: '1px solid #E5E5E5', marginBottom: '40px' }} />

                {/* Article body */}
                <div className="post-body">
                    <MDXRemote {...mdxSerialized} components={mdxComponents} />
                </div>

                {/* Bottom hairline + author */}
                <div style={{ borderTop: '1px solid #E5E5E5', marginTop: '56px', paddingTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {post.authorImage && (
                            <img
                                src={post.authorImage}
                                alt={post.authorName || 'Author'}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E5E5' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                        <div>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, color: '#0A0A0A', margin: 0 }}>
                                {post.authorName || 'Liban Adan'}
                            </p>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#6B6B6B', margin: 0 }}>
                                {post.authorTitle || 'Founder, VirtualAddressHub'}
                            </p>
                        </div>
                    </div>
                    <button className="back-btn" onClick={onBack}>
                        <span style={{ fontSize: '16px' }}>←</span>
                        <span>Back to blog</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
