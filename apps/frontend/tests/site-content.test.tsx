import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { contactFaq, faqJsonLd, pricingFaq } from '../lib/marketing';
import { OG_IMAGES } from '../lib/site';

const read = (f: string) => readFileSync(path.resolve(__dirname, '..', f), 'utf8');

describe('public site content', () => {
  it('shows no picture descriptions as visible captions', () => {
    expect(read('components/HomePage.tsx')).not.toMatch(/· Illustration/);
    expect(read('components/marketing/HowItWorks.tsx')).not.toMatch(/className=\{s\.caption\}>\s*Illustration/);
  });
  it('has no placeholders or promises the service does not make', () => {
    for (const f of ['components/KYCPolicyPage.tsx', 'components/HomePage.tsx', 'components/PlansPage.tsx', 'components/ContactPage.tsx', 'app/signup/page.tsx']) {
      expect(read(f)).not.toMatch(/\[INSERT DATE\]|free trial|NEXT_PUBLIC_QUIZ_EMBED_URL|wa\.me\/447000000000/i);
    }
    expect(read('components/KYCPolicyPage.tsx')).toContain('Last updated: 27 November 2026');
    expect(read('components/PrivacyPolicyPage.tsx')).toContain('Last updated: 27 November 2026');
  });
  it('the quiz page is gone and old links redirect', async () => {
    expect(existsSync(path.resolve(__dirname, '../app/(marketing)/compliance-check/page.tsx'))).toBe(false);
    const config = createRequire(import.meta.url)('../next.config.js');
    expect(await config.redirects()).toEqual(expect.arrayContaining([
      { source: '/compliance-check', destination: '/help', permanent: true },
      { source: '/plans', destination: '/pricing', permanent: true },
    ]));
  });
  it('every page that sets its own share details keeps the share card', () => {
    expect(OG_IMAGES[0]).toMatchObject({ url: '/social-card', width: 1200, height: 630 });
    for (const f of ['app/(public)/pricing/page.tsx', 'app/(public)/about/page.tsx', 'app/(public)/contact/page.tsx', 'app/(public)/blog/page.tsx', 'app/(public)/services/page.tsx']) {
      const src = read(f);
      if (src.includes('openGraph')) expect(src).toMatch(/images:/);
    }
  });
  it('FAQ markup is valid FAQPage data built from the answers shown on the page', () => {
    const ld = faqJsonLd(pricingFaq);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(pricingFaq.length);
    expect(ld.mainEntity[0]).toMatchObject({ '@type': 'Question', acceptedAnswer: { '@type': 'Answer' } });
    expect(contactFaq.find(f => /scanned/.test(f.q))?.a).toMatch(/same working day/);
  });
});
