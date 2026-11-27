'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { helpArticles, helpCategories, searchHelp } from '@/lib/help-content';
import m from './marketing/Marketing.module.css';
import s from './marketing/HelpCentre.module.css';
export function HelpPage(_props: { onNavigate?: (page: string) => void; onGoBack?: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  useEffect(() => {
    const read = () => {
      const id = window.location.hash.slice(1);
      setCategory(helpCategories.some((c) => c.id === id) ? id : 'all');
      setQuery('');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const results = useMemo(() => searchHelp(query, category), [query, category]);
  const choose = (id: string) => {
    setQuery('');
    setCategory(id);
    window.history.replaceState(null, '', id === 'all' ? window.location.pathname : `#${id}`);
  };
  return (
    <div className={`${m.site} ${s.page}`}>
      <section className={s.hero}>
        <div className={m.wrap}>
          <p className={m.kicker}>THE VIRTUALADDRESSHUB HELP CENTRE</p>
          <div className={s.heroGrid}>
            <div>
              <h1>
                A little clarity
                <br />
                goes a long way.
              </h1>
              <p className={m.lead}>
                From your first question to your next piece of post. Find practical help for your
                London business address and online account.
              </p>
            </div>
            <div className={s.searchPanel}>
              <label htmlFor="help-search">What would you like to know?</label>
              <div className={s.searchBox}>
                <input
                  id="help-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCategory('all');
                    window.history.replaceState(null, '', window.location.pathname);
                  }}
                  placeholder="Try invoices, verification or scanned letters"
                  aria-describedby="search-tip"
                />
                <button type="button" onClick={() => setQuery('')} disabled={!query}>
                  Clear
                </button>
              </div>
              <p id="search-tip">Search all questions, instructions and support answers.</p>
              <div className={s.quickLinks}>
                <Link href="/help/read-download-mail">Read your mail →</Link>
                <Link href="/help/manage-billing">Manage billing →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className={`${m.wrap} ${s.layout}`}>
        <nav aria-label="Help categories" className={s.categories}>
          <p className={s.label}>BROWSE BY TOPIC</p>
          <button aria-pressed={category === 'all'} onClick={() => choose('all')}>
            All help <span>{helpArticles.length}</span>
          </button>
          {helpCategories.map((c) => (
            <button key={c.id} aria-pressed={category === c.id} onClick={() => choose(c.id)}>
              {c.title}
              <span>{helpArticles.filter((a) => a.category === c.id).length}</span>
            </button>
          ))}
        </nav>
        <div className={s.results}>
          <p role="status" aria-live="polite" className={s.resultCount}>
            {results.length} {results.length === 1 ? 'answer' : 'answers'}
            {query.trim()
              ? ` matching “${query.trim()}”`
              : category === 'all'
                ? ' across all topics'
                : ''}
          </p>
          {results.length === 0 && (
            <div className={s.empty}>
              <h2>Let’s try another way.</h2>
              <p>
                Try a shorter phrase, such as “payment” or “scan”. You can also browse all topics or
                contact our team.
              </p>
              <button className={m.button} onClick={() => choose('all')}>
                Browse all help
              </button>
              <p>
                <Link href="/contact">Contact support →</Link>
              </p>
            </div>
          )}
          {helpCategories.map((c) => {
            const items = results.filter((a) => a.category === c.id);
            if (!items.length) return null;
            return (
              <section className={s.group} key={c.id} aria-labelledby={`heading-${c.id}`}>
                <p className={s.label}>
                  {String(helpCategories.indexOf(c) + 1).padStart(2, '0')} / SUPPORT TOPIC
                </p>
                <h2 id={`heading-${c.id}`}>{c.title}</h2>
                <p className={s.description}>{c.description}</p>
                {items.map((a) => (
                  <details key={a.slug} className={s.question}>
                    <summary>{a.title}</summary>
                    <div className={s.answer}>
                      <p>{a.summary}</p>
                      {a.steps.length === 0 && a.paragraphs.map((p) => <p key={p}>{p}</p>)}
                      <Link className={m.textlink} href={`/help/${a.slug}`}>
                        {a.steps.length ? 'Read the step-by-step guide' : 'Read the full answer'} →
                      </Link>
                    </div>
                  </details>
                ))}
              </section>
            );
          })}
        </div>
      </div>
      <section className={s.contact}>
        <div className={`${m.wrap} ${s.contactGrid}`}>
          <div>
            <p className={s.label}>A PERSON WHEN YOU NEED ONE</p>
            <h2>Still need a hand?</h2>
            <p>
              Tell us what you’re trying to do. Please leave passwords, payment details and identity
              documents out of your message.
            </p>
          </div>
          <Link href="/contact" className={s.contactButton}>
            Contact our team ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
