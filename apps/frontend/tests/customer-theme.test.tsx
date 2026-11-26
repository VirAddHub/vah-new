// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CustomerTheme } from '../components/CustomerTheme';
const route = vi.hoisted(() => ({ pathname: '/login' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

it.each(['/login', '/signup', '/reset-password', '/reset-password/confirm', '/mail', '/forwarding', '/account/overview', '/account/billing', '/account/addresses', '/account/verification', '/account/settings', '/account/support', '/account/businesses', '/business-owners', '/settings/profile', '/kyc'])('themes customer route %s', pathname => {
  route.pathname = pathname;
  const html = renderToStaticMarkup(<CustomerTheme><main>Customer content</main></CustomerTheme>);
  expect(html).toContain('data-customer-theme');
  expect(html).toContain('data-account-area="true"');
  expect(html).toContain('<main>Customer content</main>');
});
it.each(['/admin', '/admin/login', '/admin/dashboard', '/admin/invoices/123'])('leaves admin route %s untouched', pathname => {
  route.pathname = pathname;
  expect(renderToStaticMarkup(<CustomerTheme><main>Admin content</main></CustomerTheme>)).toBe('<main>Admin content</main>');
});
it('removes the customer boundary when navigation changes to admin', () => {
  route.pathname = '/mail';
  expect(renderToStaticMarkup(<CustomerTheme>Content</CustomerTheme>)).toContain('data-customer-theme');
  route.pathname = '/admin/dashboard';
  expect(renderToStaticMarkup(<CustomerTheme>Content</CustomerTheme>)).toBe('Content');
});
