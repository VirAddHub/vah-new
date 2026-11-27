// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { ServicesOverview } from '../components/marketing/ServicesOverview';
import { ServicePage } from '../components/marketing/ServicePage';
import sitemap from '../app/sitemap';
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const destinations = {
  '/virtual-office-london': '/services',
  '/business-address-london': '/services#london-presence',
  '/mail-scanning': '/services#digital-mail',
  '/mail-forwarding': '/services#forwarding',
};
it('renders one connected offer, one H1 and the three redirect anchors', () => {
  const html = renderToStaticMarkup(<ServicesOverview />);
  expect(html.match(/<h1/g)).toHaveLength(1);
  for (const id of ['london-presence', 'digital-mail', 'forwarding'])
    expect(html).toContain(`id="${id}"`);
  expect(html).toContain('£2 per item');
  expect(html).toContain('UK forwarding included');
  expect(html).toContain('href="/pricing"');
  expect(html).toContain('href="/how-it-works"');
});
it('does not render the service address or invent subscription amounts', () => {
  const html = renderToStaticMarkup(<ServicesOverview />);
  expect(html).not.toMatch(/Tanner|SE1\s*3PH|54[–-]58|£9\.99|£89\.99/);
  expect(html).toContain('required identity and business checks');
});
it('permanently redirects redundant URLs without a chain', async () => {
  const config = require('../next.config.js');
  const redirects = await config.redirects();
  for (const [source, destination] of Object.entries(destinations)) {
    expect(redirects).toContainEqual({ source, destination, permanent: true });
    expect(readFileSync(path.join(root, 'app/(public)', source, 'page.tsx'), 'utf8')).toContain(
      `permanentRedirect('${destination}')`,
    );
  }
});
it('sitemap lists consolidated and distinct pages, not redirect sources', async () => {
  const urls = (await sitemap()).map((x) => x.url);
  for (const p of ['/services', '/registered-office-address', '/directors-service-address'])
    expect(urls).toContain(`https://virtualaddresshub.co.uk${p}`);
  for (const p of Object.keys(destinations))
    expect(urls).not.toContain(`https://virtualaddresshub.co.uk${p}`);
});
it('retains genuinely different registered-office and director questions', () => {
  const registered = renderToStaticMarkup(<ServicePage slug="registered-office-address" />);
  const director = renderToStaticMarkup(<ServicePage slug="directors-service-address" />);
  expect(registered).toContain('Scottish or Northern Irish');
  expect(director).toContain('make me a UK resident');
  expect(registered).not.toContain('make me a UK resident');
  expect(director).not.toContain('Scottish or Northern Irish');
});
it('keeps the public homepage detached from the legacy customer app', () => {
  const source = readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  expect(source).not.toMatch(/components\/App|NavigationProvider/);
  expect(source).toContain('getServerPricing');
});
it('main navigation has one services destination and no services dropdown', () => {
  const source = readFileSync(path.join(root, 'components/MarketingNavigation.tsx'), 'utf8');
  expect(source).toContain('href="/services"');
  expect(source).toContain('Our services');
  expect(source).not.toContain('<summary>Services</summary>');
  expect(source).not.toContain('services.map');
});
