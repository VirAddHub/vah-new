import Link from 'next/link';
import { services, SITE_URL } from '@/lib/marketing';
import { LondonIllustration } from './LondonIllustration';
import s from './Marketing.module.css';
export function ServicePage({ slug }: { slug: string }) {
  const v = services.find((x) => x.slug === slug)!;
  const isRegistered = slug === 'registered-office-address';
  const questions = isRegistered
    ? [
        [
          'Is a registered office the same as a trading address?',
          'A registered office is the company’s official address for statutory correspondence. A trading or business correspondence address is used for everyday business. An eligible company can use our approved address for both purposes within the subscription.',
        ],
        [
          'Can a Scottish or Northern Irish company use a London registered office?',
          'A company’s registered office must remain in its registered jurisdiction. Our London address is in England. Do not change a Scottish or Northern Irish registered office to it without first checking the rules that apply to your company.',
        ],
        [
          'Does subscribing update Companies House for me?',
          'No company filing service is promised here. Wait for account approval and the complete address, then make the appropriate filing yourself or through your authorised adviser. Update other correspondents separately.',
        ],
        [
          'What if my home address is already on the register?',
          'Changing the current registered office does not automatically remove it from historical filings. Companies House has separate processes for protecting or removing certain personal information; read its guidance for your circumstances.',
        ],
      ]
    : [
        [
          'How is a service address different from a residential address?',
          'The service address is used for correspondence about your role as a director and can be public. Your usual residential address is your actual home address, supplied separately to Companies House. Do not substitute our address for your residential address.',
        ],
        [
          'Can it be the same as my company’s registered office?',
          'A director can use the company’s registered office as a service address where appropriate. The two addresses have different purposes even when they are the same physical address. Confirm eligibility and account approval before using ours.',
        ],
        [
          'Does a director’s service address make me a UK resident?',
          'No. A correspondence address does not establish residence, tax status or permission to work. It also does not replace your own identity verification or company obligations.',
        ],
        [
          'Will my existing home address disappear from public filings?',
          'No automatic removal takes place. Use Companies House guidance to understand the separate options for historical documents and protected information.',
        ],
      ];
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
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Our services',
                  item: `${SITE_URL}/services`,
                },
                { '@type': 'ListItem', position: 3, name: v.title, item: `${SITE_URL}/${slug}` },
              ],
            },
          ]).replace(/</g, '\u003c'),
        }}
      />
      <div className={`${s.wrap} ${s.breadcrumbs}`}>
        <Link href="/">Home</Link> / <Link href="/services">Our services</Link> / {v.title}
      </div>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>{v.eyebrow}</p>
            <h1>{v.title}</h1>
            <p className={s.lead}>{v.intro}</p>
            <p>{v.body}</p>
            <div className={s.actions}>
              <Link href="/services" className={s.button}>
                Included in our subscription ↗
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
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={s.section}>
        <div className={s.wrap}>
          <p className={s.kicker}>Included in the bigger picture</p>
          <h2>One address. Connected services.</h2>
          <p>
            This address use belongs to the same subscription as your business correspondence
            address and digital mail management. There is no separate address package to assemble.
          </p>
          <div className={s.actions}>
            <Link href="/services" className={s.button}>
              See everything included →
            </Link>
            <Link
              href={isRegistered ? '/directors-service-address' : '/registered-office-address'}
              className={s.textlink}
            >
              {isRegistered
                ? 'Compare director’s service addresses'
                : 'Compare registered office addresses'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
