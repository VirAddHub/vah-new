import { jsonLdScript } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import Link from 'next/link';
import m from '@/components/marketing/Marketing.module.css';
import s from '@/components/marketing/ResourceEditorial.module.css';

const description =
  'VirtualAddressHub offers a professional Central London business address, simple pricing, and online mail management for founders and growing UK businesses.';

export const metadata: Metadata = {
  title: 'About Us | VirtualAddressHub',
  description,
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://virtualaddresshub.co.uk/about',
  },
  openGraph: {
    title: 'About Us | VirtualAddressHub',
    description,
    url: 'https://virtualaddresshub.co.uk/about',
  },
};

const aboutPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About VirtualAddressHub',
  description,
  url: 'https://virtualaddresshub.co.uk/about',
  isPartOf: {
    '@type': 'WebSite',
    name: 'VirtualAddressHub',
    url: 'https://virtualaddresshub.co.uk',
  },
};

export default function AboutPage() {
  return (
    <div className={`${m.site} ${s.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(aboutPageJsonLd) }}
      />
      <header className={s.aboutHero}>
        <div className={m.wrap}>
          <p className={m.kicker}>ABOUT VIRTUALADDRESSHUB</p>
          <h1>
            Work can happen anywhere.
            <br />
            Your business still needs an address.
          </h1>
          <p className={m.lead}>
            We bring a Central London business presence and digital mail management together in one
            subscription.
          </p>
        </div>
      </header>
      <div className={`${m.wrap} ${s.aboutBody}`}>
        <div>
          <h2>
            A focused service.
            <br />A practical purpose.
          </h2>
          <p>
            VirtualAddressHub is for founders and businesses that work elsewhere but need a
            professional home for their correspondence.
          </p>
          <p>
            It is an address and mail service—not office rental, meeting space or a place for your
            customers to visit.
          </p>
          <div className={m.actions}>
            <Link href="/services" className={m.button}>
              Explore the service ↗
            </Link>
            <Link href="/contact" className={m.textlink}>
              Talk to us
            </Link>
          </div>
        </div>
        <div>
          {[
            [
              '01',
              'Keep business and home separate.',
              'Use an approved business address for eligible correspondence and filings, instead of putting your home address on new business materials.',
            ],
            [
              '02',
              'Keep your post within reach.',
              'View and download available digital scans through your customer account, wherever you work.',
            ],
            [
              '03',
              'Keep the offer straightforward.',
              'One core service with monthly or annual billing. Required checks, eligibility and approval apply before address use.',
            ],
          ].map(([n, title, body]) => (
            <div className={s.principle} key={n}>
              <span className={s.number}>{n}</span>
              <p>
                <strong>{title}</strong>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
