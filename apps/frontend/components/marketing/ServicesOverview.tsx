import Link from 'next/link';
import { LondonIllustration } from './LondonIllustration';
import { SITE_URL } from '@/lib/marketing';
import s from './ServicesOverview.module.css';

export function ServicesOverview() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Central London virtual office and mail management subscription',
    description:
      'Business address services and digital mail management in one subscription, with eligible physical letter forwarding.',
    url: `${SITE_URL}/services`,
    provider: { '@type': 'Organization', name: 'VirtualAddressHub', url: SITE_URL },
    areaServed: { '@type': 'Place', name: 'Central London' },
  };
  return (
    <article className={s.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            schema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Our services',
                  item: `${SITE_URL}/services`,
                },
              ],
            },
          ]).replace(/</g, '\u003c'),
        }}
      />
      <section className={s.hero}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>OUR SERVICES / ONE CONNECTED SUBSCRIPTION</p>
          <div className={s.heroGrid}>
            <div>
              <h1>
                A London presence.
                <br />
                Your post, taken care of.
              </h1>
              <p className={s.lead}>
                One professional business address. The address services you need. A simpler way to
                manage your letters, wherever you work.
              </p>
              <p>
                No separate address packages to piece together. Our London virtual office brings
                business correspondence, eligible company address use and digital mail management
                into one subscription.
              </p>
              <div className={s.actions}>
                <Link href="/pricing" className={s.cta}>
                  Explore subscription plans ↗
                </Link>
                <Link href="/how-it-works" className={s.link}>
                  See how it works →
                </Link>
              </div>
            </div>
            <div className={s.package}>
              <p className={s.packageLabel}>THE VIRTUALADDRESSHUB SUBSCRIPTION</p>
              <p className={s.packageTitle}>
                One address.
                <br />
                More room to work your way.
              </p>
              <ul>
                <li>Business, registered office & director’s address use*</li>
                <li>Digital mail scanning & online management</li>
                <li>Physical forwarding when you need an original</li>
              </ul>
              <p className={s.small}>
                *Subject to eligibility and approval. Forwarding conditions and additional charges
                are explained below.
              </p>
            </div>
          </div>
          <nav aria-label="On this page" className={s.jump}>
            <a href="#london-presence">01 / Your London presence</a>
            <a href="#digital-mail">02 / Your business mail</a>
            <a href="#forwarding">03 / The original letter</a>
          </nav>
        </div>
      </section>
      <section id="london-presence" className={s.section}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.eyebrow}>01 / YOUR LONDON BUSINESS PRESENCE</p>
            <h2>
              Work where you want.
              <br />
              Correspond from London.
            </h2>
            <p className={s.lead}>
              A Central London business address gives your correspondence a consistent home, without
              renting an office or putting your residential address on new business materials.
            </p>
            <dl className={s.definitions}>
              <div>
                <dt>For everyday business</dt>
                <dd>
                  Use your approved correspondence address on your website, invoices and business
                  letters.
                </dd>
              </div>
              <div>
                <dt>For your company</dt>
                <dd>
                  Registered office address use for eligible companies in England and Wales.{' '}
                  <Link href="/registered-office-address">
                    Understand registered office requirements →
                  </Link>
                </dd>
              </div>
              <div>
                <dt>For your role as a director</dt>
                <dd>
                  A service address for correspondence about your company role.{' '}
                  <Link href="/directors-service-address">
                    Understand director’s service addresses →
                  </Link>
                </dd>
              </div>
            </dl>
            <p className={s.small}>
              Using a different address on new filings does not automatically remove a home address
              from historical public records.
            </p>
          </div>
          <div className={s.location}>
            <LondonIllustration variant="privacy" />
            <div className={s.example}>
              <span>EXAMPLE BUSINESS ADDRESS</span>
              <p>
                Your Company Ltd
                <br />
                Central London
                <br />
                United Kingdom
              </p>
              <small>Full details are supplied after payment, required checks and approval.</small>
            </div>
            <Link href="/london-address" className={s.link}>
              Explore your Central London presence →
            </Link>
          </div>
        </div>
      </section>
      <section id="digital-mail" className={`${s.section} ${s.dark}`}>
        <div className={`${s.wrap} ${s.split}`}>
          <div
            className={s.mailVisual}
            aria-label="Illustration of business post becoming digital correspondence"
          >
            <div className={s.letter}>
              <span>BUSINESS CORRESPONDENCE</span>
              <div className={s.paperLines} />
              <div className={s.paperLines} />
              <div className={s.paperLines} />
              <p>
                Your next opportunity.
                <br />
                Your next important letter.
              </p>
            </div>
            <div className={s.mailCaption}>RECEIVED IN LONDON → AVAILABLE ONLINE</div>
          </div>
          <div>
            <p className={s.eyebrow}>02 / YOUR BUSINESS MAIL, WHEREVER YOU ARE</p>
            <h2>
              A letter arrives.
              <br />
              You don’t have to.
            </h2>
            <p className={s.lead}>
              Digital mail scanning puts available correspondence in your secure customer dashboard.
              Read a letter and download its scan without waiting for it to reach your door.
            </p>
            <p>
              Online mail management is included in the subscription. Access eligible correspondence
              through your account, keep track of incoming letters and decide whether you need a
              physical original.
            </p>
            <p className={s.small}>
              Mail access depends on your account standing, subscription and required checks.
              Scanning restrictions apply; we do not promise a processing time for every item.
            </p>
          </div>
        </div>
      </section>
      <section id="forwarding" className={s.section}>
        <div className={s.wrap}>
          <div className={s.headingRow}>
            <div>
              <p className={s.eyebrow}>03 / WHEN YOU NEED THE ORIGINAL</p>
              <h2>
                Some letters are
                <br />
                worth keeping in hand.
              </h2>
            </div>
            <p className={s.lead}>
              Request eligible physical originals through your account. Reading a digital scan and
              forwarding the letter are separate services, with clear forwarding conditions.
            </p>
          </div>
          <dl className={s.charges}>
            <div>
              <dt>HMRC & Companies House letters</dt>
              <dd>
                <strong>UK forwarding included</strong>
                <span>As set out in the current service terms.</span>
              </dd>
            </div>
            <div>
              <dt>Other UK business letters</dt>
              <dd>
                <strong>£2 per item</strong>
                <span>An additional forwarding charge, separate from your subscription.</span>
              </dd>
            </div>
            <div>
              <dt>International forwarding</dt>
              <dd>
                <strong>Quoted on request</strong>
                <span>Contact us about the destination and eligible letter.</span>
              </dd>
            </div>
          </dl>
          <div className={s.notes}>
            <p>
              <strong>Request originals promptly.</strong> Letters aged 30 days or more cannot be
              forwarded under the current forwarding window. Physical retention and digital scan
              availability are different; check your account and the terms.
            </p>
            <p>
              <strong>Letters, not parcels.</strong> This service does not include parcel handling,
              desks, meeting rooms, telephone answering or a location for your customers to visit.
            </p>
          </div>
          <Link href="/terms" className={s.link}>
            Read the service and forwarding terms →
          </Link>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.eyebrow}>BEFORE YOU CHOOSE</p>
            <h2>
              One subscription.
              <br />A clear understanding.
            </h2>
            <p>
              Choose monthly or annual billing on our pricing page. The address services and digital
              mail management belong to the same package; eligible forwarding charges are separate.
            </p>
          </div>
          <div className={s.questions}>
            <details>
              <summary>Can I register my company using this address?</summary>
              <p>
                Eligible companies registered in England and Wales can use the address once
                approved. The registered office must be appropriate for your company and
                jurisdiction. Read our registered office guide before making a filing.
              </p>
            </details>
            <details>
              <summary>When can I start using my address?</summary>
              <p>
                Only after successful payment, required identity and business checks, and account
                approval. Payment alone does not activate address use or remove a suspension.
              </p>
            </details>
            <details>
              <summary>Will this keep my home address private?</summary>
              <p>
                It helps keep your home address separate from new public business correspondence and
                eligible filings. It does not remove existing information from the public register.
              </p>
            </details>
            <details>
              <summary>Where do I find current subscription prices?</summary>
              <p>
                Our pricing page shows the current monthly and annual amounts. Review the plan,
                renewal and cancellation conditions before checkout; no estimated subscription
                prices are used here.
              </p>
            </details>
          </div>
        </div>
      </section>
      <section className={s.close}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>YOUR BUSINESS. YOUR LONDON ADDRESS.</p>
          <h2>
            Keep the ambition.
            <br />
            Simplify the admin.
          </h2>
          <p>One subscription for your London business presence and the post that comes with it.</p>
          <div className={s.actions}>
            <Link href="/pricing" className={s.cta}>
              Choose your subscription ↗
            </Link>
            <Link href="/contact" className={s.link}>
              Ask us a question
            </Link>
          </div>
          <p className={s.small}>
            Full address details are released after required checks and approval.
          </p>
        </div>
      </section>
    </article>
  );
}
