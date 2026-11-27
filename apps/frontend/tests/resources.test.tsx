import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BlogArticlePage from '../app/(public)/blog/[slug]/page';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BlogPage } from '../components/BlogPage';
import sitemap from '../app/sitemap';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('../lib/server/backendOrigin', () => ({ getBackendOrigin: () => 'https://example.test' }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const posts = [
  {
    id: 1,
    slug: 'sample-post',
    title: 'Managing correspondence',
    excerpt: 'Organise business letters.',
    category: 'Mail',
    dateLong: '27 November 2026',
    dateShort: '27 Nov',
    readTime: '3 min',
    imageUrl: '',
  },
];
it('lists published articles only, with genuine links and no invented cover placeholder', () => {
  render(<BlogPage initialPosts={posts} />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Notes on running/);
  expect(screen.getByRole('link', { name: 'Managing correspondence' })).toHaveAttribute('href', '/blog/sample-post');
  expect(screen.queryByRole('link', { name: /company’s registered office/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/guides/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/drop in/)).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('searches articles and clears a no-match search', () => {
  render(<BlogPage initialPosts={posts} />);
  const search = screen.getByRole('searchbox');
  fireEvent.change(search, { target: { value: '  CORRESPONDENCE  ' } });
  expect(screen.getByRole('link', { name: 'Managing correspondence' })).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'no-match-xyz' } });
  expect(screen.getByRole('status')).toHaveTextContent('0 articles matching your search');
  expect(screen.queryByRole('link', { name: 'Managing correspondence' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByRole('link', { name: 'Managing correspondence' })).toBeInTheDocument();
});
it('says plainly when nothing is published yet and avoids refetching initial data', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<BlogPage initialPosts={[]} />);
  expect(screen.getByText('New articles will appear here soon.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
it('uses permanent direct redirects and excludes their sources from the sitemap', async () => {
  const require = createRequire(import.meta.url);
  const config = require('../next.config.js');
  expect(await config.redirects()).toEqual(
    expect.arrayContaining([
      { source: '/guides', destination: '/blog', permanent: true },
      { source: '/london-address', destination: '/services#london-presence', permanent: true },
    ]),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, data: [] }) })),
  );
  const urls = (await sitemap()).map((p) => p.url);
  expect(urls).toContain('https://virtualaddresshub.co.uk/blog');
  expect(urls).not.toContain('https://virtualaddresshub.co.uk/guides');
  expect(urls).not.toContain('https://virtualaddresshub.co.uk/london-address');
});
it('keeps Resources to the Blog and Help Centre without a competing FAQ destination', () => {
  const nav = readFileSync(
    path.resolve(__dirname, '../components/MarketingNavigation.tsx'),
    'utf8',
  );
  expect(nav).toContain('href="/blog">Blog<');
  expect(nav).not.toContain('Guides & articles');
  expect(nav).toContain('href="/help"');
  expect(nav).not.toContain('href="/#faq"');
  expect(nav).not.toContain('href="/guides"');
});

it('retains published article content and one H1 with safely rendered Markdown', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify({
            ok: true,
            data: url.endsWith('/sample-post')
              ? {
                  slug: 'sample-post',
                  title: 'Sample article',
                  content: '# Body heading\n\nUseful guidance.',
                  date: '2026-11-27',
                }
              : [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ),
  );
  const html = renderToStaticMarkup(
    await BlogArticlePage({ params: Promise.resolve({ slug: 'sample-post' }) }),
  );
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain('Useful guidance.');
  expect(html).toContain('<h2>Body heading</h2>');
  expect(html).toContain('href="/blog"');
});
