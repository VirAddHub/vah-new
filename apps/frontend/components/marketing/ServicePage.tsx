import Link from 'next/link';
import { services, SITE_URL } from '@/lib/marketing';
import { LondonIllustration } from './LondonIllustration';
import s from './Marketing.module.css';
export function ServicePage({ slug }: { slug: string }) {
  const v = services.find((x) => x.slug === slug)!;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: v.title,
    description: v.body,
    url: `${SITE_URL}/${slug}`,
    provider: { '@type': 'Organization', name: 'VirtualAddressHub', url: SITE_URL },
  };
  return (
    <div className={s.site}>
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
                { '@type': 'ListItem', position: 2, name: v.title, item: `${SITE_URL}/${slug}` },
              ],
            },
          ]).replace(/</g, '\u003c'),
        }}
      />
      <div className={`${s.wrap} ${s.breadcrumbs}`}>
        <Link href="/">Home</Link> / {v.title}
      </div>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>{v.eyebrow}</p>
            <h1>{v.title}</h1>
            <p className={s.lead}>{v.intro}</p>
            <p>{v.body}</p>
            <div className={s.actions}>
              <Link href="/pricing" className={s.button}>
                Explore subscription plans ↗
              </Link>
            </div>
            <p className={s.note}>Subject to eligibility, payment, verification and approval.</p>
          </div>
          <LondonIllustration variant={v.visual} />
        </div>
      </section>
      <section className={s.section}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>In practice</p>
            <h2>
              How it helps
              <br />
              your business.
            </h2>
            <p>{v.example}</p>
          </div>
          <div>
            <h3>What to know before you start</h3>
            <p>{v.detail}</p>
            <p>
              Read the{' '}
              <Link className={s.textlink} href="/terms">
                service terms
              </Link>{' '}
              and{' '}
              <Link className={s.textlink} href="/how-it-works">
                onboarding steps
              </Link>{' '}
              before applying. Contact us if you are unsure about your business’s eligibility.
            </p>
            {(slug.includes('registered') || slug.includes('directors')) && (
              <p>
                <a
                  className={s.textlink}
                  href="https://www.gov.uk/guidance/your-personal-information-on-the-companies-house-register"
                >
                  Companies House guidance on address information →
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`}>
        <div className={`${s.wrap} ${s.faq}`}>
          <h2>Your questions, answered.</h2>
          <details>
            <summary>Is this part of the subscription?</summary>
            <p>
              Our address services and digital mail management are offered together. Physical
              forwarding has additional conditions and charges; check the current plans and terms.
            </p>
          </details>
          <details>
            <summary>Can I use it as soon as I pay?</summary>
            <p>
              No. Required identity and business checks and account approval must be complete before
              you use the address. Payment does not override a suspension.
            </p>
          </details>
          <details>
            <summary>How do I get started?</summary>
            <p>
              Choose a plan, create your account and follow payment and verification instructions.
              Wait for approval before changing your business address.
            </p>
          </details>
        </div>
      </section>
      <section className={s.section}>
        <div className={s.wrap}>
          <p className={s.kicker}>Included in the bigger picture</p>
          <h2>One address. Connected services.</h2>
          <div className={s.services}>
            {services
              .filter((x) => x.slug !== slug)
              .map((x) => (
                <Link key={x.slug} href={`/${x.slug}`}>
                  {x.title}
                  <span aria-hidden>↗</span>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
