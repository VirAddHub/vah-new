import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseJsonSafe } from '@/lib/http';
import { formatBlogDate } from '@/lib/blog-date-formatter';
import Link from 'next/link';

type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  date?: string;
  dateLong?: string;
  updated?: string;
  tags?: string[];
  readTime?: string;
  content?: string;
  html?: string;
  authorName?: string;
  authorTitle?: string;
  authorImage?: string;
  cover?: string;
};

type BlogPostListItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string;
};

const FALLBACK_ORIGIN = 'http://localhost:3000';

async function resolveAppBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`;
  } catch (_) {}
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.VERCEL_URL;
  if (!envUrl) return FALLBACK_ORIGIN;
  return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const base = await resolveAppBaseUrl();
    const res = await fetch(`${base}/api/bff/blog/detail?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    let json: any;
    try { json = await parseJsonSafe(res); } catch { return null; }
    if (!json?.ok || !json?.data) return null;
    return json.data as BlogPost;
  } catch { return null; }
}

async function getRelatedPosts(currentSlug: string): Promise<BlogPostListItem[]> {
  try {
    const base = await resolveAppBaseUrl();
    const res = await fetch(`${base}/api/bff/blog/list`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return [];
    let json: any;
    try { json = await parseJsonSafe(res); } catch { return []; }
    if (!json?.ok || !json?.data) return [];
    return (json.data as BlogPostListItem[]).filter(p => p.slug !== currentSlug).slice(0, 3);
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found | VirtualAddressHub Blog' };
  const description = post.description || post.excerpt || 'Read this article on the VirtualAddressHub blog.';
  return {
    title: `${post.title} | VirtualAddressHub Blog`,
    description,
    openGraph: { title: post.title, description, url: `https://virtualaddresshub.co.uk/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const relatedPosts = await getRelatedPosts(slug);

  if (!post) return notFound();

  const hasHtml = typeof post.html === 'string' && post.html.trim().length > 0;
  const dateLabel = formatBlogDate(post.dateLong || post.date || post.updated);
  const categoryLabel = post.tags && post.tags.length > 0 ? post.tags[0] : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description || post.excerpt,
    "url": `https://virtualaddresshub.co.uk/blog/${slug}`,
    "datePublished": post.date,
    "dateModified": post.updated || post.date,
    "author": { "@type": "Person", "name": post.authorName || "Liban Adan" },
    "publisher": { "@type": "Organization", "name": "VirtualAddressHub" },
    "image": post.cover,
    "articleSection": categoryLabel || "General",
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#F2EBDD', minHeight: '100vh' }}>
      <style>{`
        .post-body { font-family: 'Poppins', sans-serif; font-size: clamp(15px, 2vw, 17px); color: #3D362C; line-height: 1.8; }
        .post-body h1, .post-body h2, .post-body h3, .post-body h4 {
          font-family: 'Poppins', sans-serif; color: #1F1A14; font-weight: 600;
          letter-spacing: -0.02em; margin: 1.8em 0 0.6em; line-height: 1.2;
        }
        .post-body h1 { font-size: clamp(22px,3vw,30px); }
        .post-body h2 { font-size: clamp(19px,2.5vw,25px); }
        .post-body h3 { font-size: clamp(16px,2vw,20px); }
        .post-body p { margin: 0 0 1.3em; }
        .post-body ul, .post-body ol { padding-left: 22px; margin: 0 0 1.3em; }
        .post-body li { margin-bottom: 6px; }
        .post-body strong { color: #1F1A14; font-weight: 600; }
        .post-body a { color: #1F4934; text-decoration: underline; }
        .post-body a:hover { opacity: 0.75; }
        .post-body blockquote {
          border-left: 3px solid #1F4934; margin: 1.5em 0;
          padding: 4px 0 4px 20px; color: #7A6F5E; font-style: italic;
        }
        .post-body code {
          background: #E8E0CE; padding: 2px 6px; border-radius: 3px;
          font-family: 'IBM Plex Mono', monospace; font-size: 0.88em; color: #1F1A14;
        }
        .post-body pre {
          background: #1F1A14; color: #F2EBDD; padding: 20px; border-radius: 6px;
          overflow-x: auto; margin: 1.5em 0;
        }
        .post-body pre code { background: none; padding: 0; color: inherit; }
        .post-body hr { border: none; border-top: 1px solid #D7CDB6; margin: 2.5em 0; }
        .post-body img { max-width: 100%; border-radius: 4px; margin: 1em 0; border: 1px solid #D7CDB6; }
        .back-link {
          display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
          font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500; color: #1F4934;
          transition: opacity 0.15s; margin-bottom: 40px;
        }
        .back-link:hover { opacity: 0.7; }
        .related-card {
          display: flex; flex-direction: column; text-decoration: none;
          border: 1px solid #D7CDB6; border-radius: 4px; overflow: hidden;
          background: #FBF6E9; transition: border-color 0.15s;
        }
        .related-card:hover { border-color: #1F4934; }
        .related-card:hover .related-title { color: #1F4934; }
        .related-title { transition: color 0.15s; }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <article style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,40px) clamp(60px,8vw,100px)' }}>

        {/* Back link */}
        <Link href="/blog" className="back-link">
          <span style={{ fontSize: '16px' }}>←</span>
          <span>Back to blog</span>
        </Link>

        {/* Meta row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: '11px', color: '#7A6F5E',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: '18px',
        }}>
          {categoryLabel && (
            <>
              <span style={{ color: '#1F4934', fontWeight: 500 }}>{categoryLabel}</span>
              <span>·</span>
            </>
          )}
          {dateLabel && <span>{dateLabel}</span>}
          {post.readTime && <><span>·</span><span>{post.readTime}</span></>}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 'clamp(26px,4vw,44px)',
          fontWeight: 600,
          color: '#1F1A14',
          margin: '0 0 18px',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
        }}>
          {post.title}
        </h1>

        {/* Description */}
        {(post.description || post.excerpt) && (
          <p style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 'clamp(15px,2vw,18px)',
            color: '#7A6F5E',
            margin: '0 0 32px',
            lineHeight: 1.55,
            fontWeight: 300,
          }}>
            {post.description || post.excerpt}
          </p>
        )}

        {/* Cover image */}
        {post.cover && (
          <div style={{ margin: '0 0 40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #D7CDB6' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover} alt={post.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #D7CDB6', marginBottom: '40px' }} />

        {/* Body */}
        <div className="post-body">
          {hasHtml ? (
            <div dangerouslySetInnerHTML={{ __html: post.html as string }} suppressHydrationWarning />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
                h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
                p:  ({ children, ...props }) => <p {...props}>{children}</p>,
                ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
                ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
                li: ({ children, ...props }) => <li {...props}>{children}</li>,
                a:  ({ children, ...props }) => <a {...props}>{children}</a>,
                strong: ({ children, ...props }) => <strong {...props}>{children}</strong>,
                blockquote: ({ children, ...props }) => <blockquote {...props}>{children}</blockquote>,
                code: ({ className, children, ...props }) => <code className={className} {...props}>{children}</code>,
                pre: ({ children, ...props }) => <pre {...props}>{children}</pre>,
                img: ({ alt, ...props }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img {...props} alt={alt ?? ''} />
                ),
              }}
            >
              {post.content ?? ''}
            </ReactMarkdown>
          )}
        </div>

        {/* Back link bottom */}
        <div style={{ borderTop: '1px solid #D7CDB6', marginTop: '56px', paddingTop: '28px' }}>
          <Link href="/blog" className="back-link" style={{ margin: 0 }}>
            <span style={{ fontSize: '16px' }}>←</span>
            <span>Back to blog</span>
          </Link>
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section style={{ borderTop: '1px solid #D7CDB6', backgroundColor: '#E8E0CE', padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,40px)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(18px,2.5vw,22px)',
              fontWeight: 600, color: '#1F1A14', margin: '0 0 8px', letterSpacing: '-0.01em',
            }}>More from the blog</h2>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: '#7A6F5E', margin: '0 0 28px' }}>
              Keep reading
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`} className="related-card">
                  {related.imageUrl?.trim() && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={related.imageUrl} alt={related.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{ padding: '14px 16px 18px' }}>
                    {related.category && (
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                        color: '#1F4934', letterSpacing: '0.1em', textTransform: 'uppercase',
                        display: 'block', marginBottom: '6px',
                      }}>{related.category}</span>
                    )}
                    <h3 className="related-title" style={{
                      fontFamily: "'Poppins', sans-serif", fontSize: '14px',
                      fontWeight: 600, color: '#1F1A14', margin: '0 0 6px', lineHeight: 1.3,
                    }}>{related.title}</h3>
                    {related.excerpt && (
                      <p style={{
                        fontFamily: "'Poppins', sans-serif", fontSize: '12px',
                        color: '#7A6F5E', margin: 0, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{related.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA strip */}
      <div style={{ borderTop: '1px solid #D7CDB6', padding: '32px clamp(20px,5vw,40px)', textAlign: 'center', backgroundColor: '#F2EBDD' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', color: '#7A6F5E', margin: 0 }}>
          Running a UK business?{' '}
          <Link href="/signup" style={{ color: '#1F4934', fontWeight: 500, textDecoration: 'underline' }}>
            Get a London business address
          </Link>
        </p>
      </div>
    </div>
  );
}
