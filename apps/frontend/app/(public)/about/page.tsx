import { jsonLdScript } from '@/lib/jsonLd';
import { OG_IMAGES } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';
import m from '@/components/marketing/Marketing.module.css';
import s from '@/components/marketing/ResourceEditorial.module.css';

const description =
  'VirtualAddressHub gives UK businesses a London SE1 address by Tower Bridge, with same-day mail scanning, a registered office and a director’s service address in one plan.';

export const metadata: Metadata = {
  title: 'About VirtualAddressHub | London SE1 Virtual Office',
  description,
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://virtualaddresshub.co.uk/about',
  },
  openGraph: {
    images: OG_IMAGES,
    title: 'About VirtualAddressHub | London SE1 Virtual Office',
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
            VirtualAddressHub is a London business address and mail service, by Tower Bridge in
            SE1. We give companies and sole traders an official address, and we get their post to
            them the same working day it arrives.
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
            Most small businesses don’t need an office. They need somewhere official for their post
            to go, an address they can put on the public register without it being their home,
            and a way to read letters from HMRC and Companies House wherever they are.
          </p>
          <p>
            That is all we do, and we try to do it well. We don’t rent desks or meeting rooms, and
            we don’t sell add-ons you didn’t ask for. One plan covers the address, its official
            uses and mail scanning.
          </p>
          <div className={m.actions}>
            <Link href="/pricing" className={m.button}>
              See pricing ↗
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
              'Your home stays private.',
              'Use our address as your registered office and director’s service address at Companies House, so your home address stays off the public register and off your invoices.',
            ],
            [
              '02',
              'Your post, the same day.',
              'We open and scan every letter the working day it arrives and email you when it is in your dashboard. Originals are kept for 30 days in case you need them posted on.',
            ],
            [
              '03',
              'Plain terms.',
              'One price, monthly or yearly. No letter limits. HMRC and Companies House letters are forwarded free within the UK; other letters are £2 each. Cancel at any time with 30 days’ notice.',
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
      <section className={m.section}>
        <div className={`${m.wrap} ${m.split}`}>
          <div>
            <p className={m.kicker}>Where we are</p>
            <h2>
              By Tower Bridge,
              <br />
              London SE1.
            </h2>
          </div>
          <div>
            <p className={m.lead}>
              Our address is on the south bank by Tower Bridge, a short walk from the City of London.
              It is a real address where your post is received and handled by our team.
            </p>
            <p>
              We give the full address to each customer once their account is approved. Keeping it
              off public pages until then helps stop people using it without permission.
            </p>
          </div>
        </div>
      </section>
      <section className={`${m.section} ${m.sage}`}>
        <div className={`${m.wrap} ${m.split}`}>
          <div>
            <p className={m.kicker}>Why we check everyone</p>
            <h2>
              A respectable address
              <br />
              for every business on it.
            </h2>
          </div>
          <div>
            <p className={m.lead}>
              Anyone offering a business address in the UK must check who they are dealing with
              under anti-money-laundering rules. We take that seriously.
            </p>
            <p>
              We verify the identity of each account holder, and of the directors and owners of each
              company. We check every company against the Companies House register and review it
              again when its details change. It is a little more work at the start. It means the
              address you share with other businesses is not misused by people you would never want
              to be associated with.
            </p>
            <Link href="/kyc" className={m.textlink}>
              Read our verification policy →
            </Link>
          </div>
        </div>
      </section>
      <section className={m.section}>
        <div className={m.wrap}>
          <p className={m.kicker}>Who uses VirtualAddressHub</p>
          <h2>Built for businesses that work from anywhere.</h2>
          {[
            ['Limited companies and LLPs', 'A registered office and director’s service address that keep your home off Companies House.'],
            ['Sole traders and freelancers', 'A professional address for your website, invoices and letters, separate from where you live.'],
            ['Founders forming a company', 'Apply before your company exists. We approve the proposed company, and you have 30 days to register it.'],
            ['Businesses run from abroad', 'A UK address with your post scanned and online the same day, wherever you are.'],
          ].map(([h, p], i) => (
            <div className={m.row} key={h}>
              <span className={m.number}>0{i + 1}</span>
              <div><h3>{h}</h3></div>
              <div><p>{p}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
