'use client';
import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import m from './marketing/Marketing.module.css';
import s from './marketing/ResourceEditorial.module.css';
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
  onNavigate?: (page: string, data?: { slug: string }) => void;
  initialPosts?: BlogPost[];
}
export function BlogPage({ initialPosts }: BlogPageProps) {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialPosts);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // If initialPosts were provided by the server, skip client fetch
    if (initialPosts !== undefined) return;

    const fetchBlogPosts = async () => {
      try {
        const response = await fetch('/api/bff/blog/list');
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          setError('Failed to load posts');
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data.ok) {
          setBlogPosts(Array.isArray(data.data) ? data.data : []);
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
  }, [initialPosts]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return blogPosts;
    const q = searchQuery.trim().toLowerCase();
    return blogPosts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    );
  }, [blogPosts, searchQuery]);

  return (
    <div className={`${m.site} ${s.page}`}>
      <header className={s.libraryHero}>
        <div className={m.wrap}>
          <p className={m.kicker}>THE VIRTUALADDRESSHUB BLOG</p>
          <div className={s.masthead}>
            <h1>
              Notes on running
              <br />
              a business from anywhere.
            </h1>
            <p>
              Articles from VirtualAddressHub on business addresses, Companies House and handling
              official mail.
            </p>
          </div>
          <div className={s.search}>
            <label htmlFor="resource-search">SEARCH THE BLOG</label>
            <input
              id="resource-search"
              type="search"
              placeholder="Search articles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setSearchQuery('')}>Clear</button>
          </div>
        </div>
      </header>
      <div className={`${m.wrap} ${s.libraryBody} ${s.libraryGrid}`}>
        <aside className={s.indexNote}>
          <p className={s.sectionLabel}>NEED A HAND?</p>
          <h2>
            Questions about
            <br />
            your account?
          </h2>
          <p>
            The blog is for reading. For account instructions, payments or help with your mail,
            use our Help Centre.
          </p>
          <Link className={m.textlink} href="/help">
            Get practical help →
          </Link>
        </aside>
        <div>
          <p role="status" className={s.sectionLabel}>
            {loading ? 'Loading articles' : `${filteredPosts.length} article${filteredPosts.length === 1 ? '' : 's'}`}
            {searchQuery.trim() ? ' matching your search' : ''}
          </p>
          <section className={s.articles} aria-label="Published articles">
            <h2>Latest articles.</h2>
            {loading && <p role="status">Loading articles…</p>}
            {error && (
              <p role="alert">
                Articles could not be loaded. Please try again shortly.
              </p>
            )}
            {!loading && !error && filteredPosts.length === 0 && (
              <p className={s.empty}>
                {searchQuery.trim()
                  ? 'No published articles match this search. Try another subject.'
                  : 'New articles will appear here soon.'}
              </p>
            )}
            {filteredPosts.map((post, i) => (
              <article
                className={`${s.story} ${i === 0 && post.imageUrl ? s.storyWithImage : ''}`}
                key={post.slug}
              >
                <div>
                  <div className={s.meta}>
                    {post.category && <span>{post.category}</span>}
                    {post.dateLong && <span>{post.dateLong}</span>}
                    {post.readTime && <span>{post.readTime}</span>}
                  </div>
                  <h3>
                    <Link href={`/blog/${encodeURIComponent(post.slug)}`}>{post.title}</Link>
                  </h3>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <Link className={m.textlink} href={`/blog/${encodeURIComponent(post.slug)}`}>
                    Read article →
                  </Link>
                </div>
                {i === 0 && post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" />}
              </article>
            ))}
          </section>
        </div>
      </div>
      <section className={s.supportBand}>
        <div className={m.wrap}>
          <p>Ready to see how the address and mail service fit together?</p>
          <Link className={m.textlink} href="/services">
            Explore the subscription →
          </Link>
        </div>
      </section>
    </div>
  );
}
