import Link from 'next/link';
import { services, SITE_URL } from '@/lib/marketing';
import e from './ResourceEditorial.module.css';
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
    <div className={`${s.site} ${e.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <header className={`${e.guideHero} ${!isRegistered ? e.directorHero : ''}`}>
        <div className={s.wrap}>
          <p className={s.breadcrumbs}>
            <Link href="/blog">Guides & articles</Link> /{' '}
            {isRegistered ? 'Company addresses' : 'Director correspondence'}
          </p>
          <p className={s.kicker}>
            {isRegistered ? 'THE COMPANY ADDRESS GUIDE' : 'THE DIRECTOR ADDRESS GUIDE'}
          </p>
          <h1>{v.title}</h1>
          <p className={`${s.lead} ${e.guideHeading}`}>{v.intro}</p>
        </div>
      </header>
      <div className={`${s.wrap} ${e.guideLayout}`}>
        <div>
          <h2>
            {isRegistered
              ? 'An official home for company correspondence.'
              : 'Your role and your home are different things.'}
          </h2>
          <p>{v.body}</p>
          <p>{v.detail}</p>
          {questions.map(([question, answer]) => (
            <section className={e.questionNotes} key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </section>
          ))}
          <p>
            <a
              className={s.textlink}
              href="https://www.gov.uk/guidance/your-personal-information-on-the-companies-house-register"
            >
              Read Companies House guidance on address information →
            </a>
          </p>
        </div>
        <aside>
          {isRegistered ? (
            <figure className={e.stationery}>
              <div className={e.stationeryPaper}>
                <small>ILLUSTRATIVE COMPANY CORRESPONDENCE</small>
                <p className={e.company}>Your Company Ltd</p>
                <p>
                  Registered office
                  <br />
                  Central London
                  <br />
                  United Kingdom
                </p>
                <hr />
                <small>Example only. Complete address provided after approval.</small>
              </div>
              <p>
                Your company’s official correspondence address. Not a workspace or visitor
                reception.
              </p>
            </figure>
          ) : (
            <div className={e.roleDiagram}>
              <p>TWO ADDRESSES / TWO PURPOSES</p>
              <div>
                <strong>Service address</strong>
                <small>
                  Correspondence about your role as a director. Can appear on the public register.
                </small>
              </div>
              <div>
                <strong>Residential address</strong>
                <small>
                  Your actual home. Supplied separately where required; never substitute our
                  business address.
                </small>
              </div>
            </div>
          )}
          <p className={s.note}>
            Address use is subject to eligibility, payment, required verification and approval.
          </p>
          <Link
            className={s.textlink}
            href={isRegistered ? '/directors-service-address' : '/registered-office-address'}
          >
            {isRegistered
              ? 'Compare the director’s service address'
              : 'Compare the company’s registered office'}{' '}
            →
          </Link>
        </aside>
      </div>
      <section className={e.supportBand}>
        <div className={s.wrap}>
          <p>This address use is part of the VirtualAddressHub subscription.</p>
          <Link className={s.textlink} href="/services">
            See what is included →
          </Link>
        </div>
      </section>
    </div>
  );
}
