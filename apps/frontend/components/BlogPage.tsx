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
const guides = [
  {
    title: 'The company’s registered office',
    text: 'Understand official company correspondence, jurisdiction and the address you put on the register.',
    href: '/registered-office-address',
  },
  {
    title: 'A director’s service address',
    text: 'Separate correspondence about your role from your residential address. Understand what becomes public.',
    href: '/directors-service-address',
  },
];
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

  const visibleGuides = guides.filter((g) =>
    `${g.title} ${g.text}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  return (
    <div className={`${m.site} ${s.page}`}>
      <header className={s.libraryHero}>
        <div className={m.wrap}>
          <p className={m.kicker}>THE BUSINESS ADDRESS LIBRARY</p>
          <div className={s.masthead}>
            <h1>
              Good decisions
              <br />
              start with a little reading.
            </h1>
            <p>
              Guides to choosing your business address, plus articles from VirtualAddressHub. One
              place to explore, at your own pace.
            </p>
          </div>
          <div className={s.search}>
            <label htmlFor="resource-search">FIND A SUBJECT</label>
            <input
              id="resource-search"
              type="search"
              placeholder="Search guides and articles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setSearchQuery('')}>Clear</button>
          </div>
        </div>
      </header>
      <div className={`${m.wrap} ${s.libraryBody} ${s.libraryGrid}`}>
        <aside className={s.indexNote}>
          <p className={s.sectionLabel}>A USEFUL DISTINCTION</p>
          <h2>
            Reading up?
            <br />
            You’re in the right place.
          </h2>
          <p>
            These guides explain address choices. For account instructions, payments or help with
            your mail, use our Help Centre.
          </p>
          <Link className={m.textlink} href="/help">
            Get practical help →
          </Link>
        </aside>
        <div>
          <p role="status" className={s.sectionLabel}>
            {visibleGuides.length + filteredPosts.length} guides and articles
            {searchQuery.trim() ? ' matching your search' : ''}
          </p>
          {visibleGuides.length > 0 && (
            <section aria-label="Address essentials">
              <h2>Start with the essentials.</h2>
              {visibleGuides.map((g, i) => (
                <Link href={g.href} className={s.guideRow} key={g.href}>
                  <span className={s.number}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{g.title}</h3>
                    <p>{g.text}</p>
                  </div>
                  <span aria-hidden>↗</span>
                </Link>
              ))}
            </section>
          )}
          <section className={s.articles} aria-label="Published articles">
            <h2>From the journal.</h2>
            {loading && <p role="status">Loading articles…</p>}
            {error && (
              <p role="alert">
                Articles could not be loaded. You can still read the address guides above.
              </p>
            )}
            {!loading && !error && filteredPosts.length === 0 && (
              <p className={s.empty}>
                {searchQuery.trim()
                  ? 'No published articles match this search. Try another subject.'
                  : 'Published articles will appear here when available. The address guides above are ready to read.'}
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
