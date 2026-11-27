import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import '@testing-library/jest-dom/vitest';
import { HomePage } from '../components/HomePage';
import { HelpPage } from '../components/HelpPage';
import { helpArticles, helpCategories, homepageHelp, searchHelp } from '../lib/help-content';
import HelpArticlePage, { generateMetadata } from '../app/(public)/help/[slug]/page';
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('../hooks/usePlans', () => ({
  usePricing: () => ({ monthlyPrice: null, annualPrice: null }),
}));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
it('has ten unique conversion answers and complete valid article links', () => {
  expect(homepageHelp).toHaveLength(10);
  expect(new Set(helpArticles.map((a) => a.slug)).size).toBe(helpArticles.length);
  for (const a of helpArticles) {
    expect(helpCategories.some((c) => c.id === a.category)).toBe(true);
    for (const l of a.links.filter((l) => l.href.startsWith('/help/')))
      expect(helpArticles.some((x) => `/help/${x.slug}` === l.href)).toBe(true);
  }
});
it('searches full instructions across all topics and handles whitespace/case', () => {
  expect(searchHelp('  MANAGE   billing ').some((a) => a.slug === 'manage-billing')).toBe(true);
  expect(searchHelp('posting date').map((a) => a.slug)).toContain('missing-mail');
  expect(searchHelp('xyznoresult')).toHaveLength(0);
  expect(searchHelp('', 'forwarding').every((a) => a.category === 'forwarding')).toBe(true);
});
it('renders crawlable answers before interaction', () => {
  const html = renderToStaticMarkup(<HelpPage />);
  for (const a of helpArticles)
    expect(html).toContain(a.title.replaceAll('&', '&amp;').replaceAll("'", '&#x27;'));
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).not.toMatch(/Tanner|SE1\s*3PH|54[–-]58|£9\.99|Royal Mail rate/);
});
it('filters categories, searches globally and resets empty results', () => {
  render(<HelpPage />);
  fireEvent.click(screen.getByRole('button', { name: /Billing & subscriptions/ }));
  expect(screen.getByText('Where are my invoices and renewal details?')).toBeInTheDocument();
  expect(screen.queryByText('What is a virtual office?')).not.toBeInTheDocument();
  const search = screen.getByRole('searchbox');
  fireEvent.change(search, { target: { value: 'posting date' } });
  expect(screen.getByText('What if a letter is missing or unexpected?')).toBeInTheDocument();
  expect(window.location.hash).toBe('');
  fireEvent.change(search, { target: { value: 'xyznoresult' } });
  expect(screen.getByText('Let’s try another way.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Browse all help' }));
  expect(search).toHaveValue('');
  expect(screen.getByText('What is a virtual office?')).toBeInTheDocument();
});
it('opens native accordions and provides direct article links', () => {
  render(<HelpPage />);
  const summary = screen.getByText('How do I view or download a scanned letter?');
  const details = summary.closest('details')!;
  expect(details.open).toBe(false);
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  expect(details.querySelector('a')).toHaveAttribute('href', '/help/read-download-mail');
  fireEvent.click(summary);
  expect(details.open).toBe(false);
});
it('honours category deep links', () => {
  window.history.replaceState(null, '', '/help#verification');
  render(<HelpPage />);
  expect(screen.getByRole('button', { name: /Identity verification/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.queryByText('What is a virtual office?')).not.toBeInTheDocument();
});
it('renders instructional articles, canonical metadata and unknown-article 404', async () => {
  const params = Promise.resolve({ slug: 'read-download-mail' });
  const html = renderToStaticMarkup(await HelpArticlePage({ params }));
  expect(html).toContain('<ol>');
  expect(html).toContain('Open scan');
  expect(html).toContain('BreadcrumbList');
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect((await generateMetadata({ params })).alternates?.canonical).toBe(
    '/help/read-download-mail',
  );
  await expect(
    HelpArticlePage({ params: Promise.resolve({ slug: 'missing-article' }) }),
  ).rejects.toThrow('NOT_FOUND');
});

it('homepage exposes ten concise native FAQ answers linked to full guidance', () => {
  render(<HomePage />);
  const faq = document.querySelector('#faq')!;
  expect(faq.querySelectorAll('details')).toHaveLength(10);
  for (const article of homepageHelp)
    expect(faq.querySelector(`a[href="/help/${article.slug}"]`)).not.toBeNull();
  const first = faq.querySelector('details')!;
  fireEvent.click(first.querySelector('summary')!);
  expect(first.open).toBe(true);
});
