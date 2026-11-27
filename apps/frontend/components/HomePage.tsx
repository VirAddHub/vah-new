'use client';
import { LondonShowcase } from './marketing/LondonShowcase';
import Link from 'next/link';
import { usePricing } from '@/hooks/usePlans';
import { homepageHelp } from '@/lib/marketing';
import { LondonIllustration } from './marketing/LondonIllustration';
import s from './marketing/Marketing.module.css';
const money = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
export function HomePage(_props: { onNavigate?: (page: string, data?: any) => void }) {
  const { monthlyPrice, annualPrice } = usePricing();
  return (
    <div className={s.site}>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>One London address. More possibilities.</p>
            <h1>
              Big ambitions.
              <br />A London business address to match.
            </h1>
            <p className={s.lead}>
              Your virtual office in London, with registered office, director’s service address and
              digital mail management in one straightforward subscription.
            </p>
            <div className={s.actions}>
              <Link className={s.button} href="/signup">
                Get your London address <span aria-hidden>↗</span>
              </Link>
              <Link className={s.textlink} href="/pricing">
                Explore plans
              </Link>
            </div>
            <p className={s.note}>
              {monthlyPrice !== null
                ? `Monthly subscription ${money(monthlyPrice)}. `
                : 'See current availability on our plans page. '}
              Address use begins after verification and approval.
            </p>
          </div>
          <div>
            <LondonIllustration />
            <p className={s.caption}>A little London presence. A lot of freedom. · Illustration</p>
          </div>
        </div>
      </section>
      <div className={s.band}>
        <div className={s.wrap}>
          <span>Central London business address</span>
          <span>Registered office & director’s address</span>
          <span>Digital mail scanning</span>
          <span>Secure online account</span>
        </div>
      </div>
      <section className={s.section}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>Your business, based your way</p>
            <h2>
              A professional address.
              <br />
              Without an office lease.
            </h2>
          </div>
          <div>
            <p className={s.lead}>
              Work from home, a studio or wherever business takes you. A virtual office gives your
              company a correspondence address while we handle the post that arrives there.
            </p>
            <p>
              Keep business letters separate from home life. Read available scans online and request
              eligible originals when you need them. No desks, meeting rooms or unnecessary extras
              to pay for.
            </p>
            <Link href="/services" className={s.textlink}>
              What is a virtual office? →
            </Link>
          </div>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`} id="services">
        <div className={s.wrap}>
          <p className={s.kicker}>One subscription, several ways to use it</p>
          <h2>
            An address that works
            <br />
            as hard as you do.
          </h2>
          {[
            {
              title: 'Your London business presence',
              intro: 'One address for the way your business works.',
              body: 'Business correspondence, registered office and director’s service address use for eligible customers—all part of the subscription.',
              href: '/services#london-presence',
            },
            {
              title: 'Your business mail, wherever you are',
              intro: 'Read available correspondence online.',
              body: 'Digital mail scanning and secure online management bring your letters to your screen, wherever you work.',
              href: '/services#digital-mail',
            },
            {
              title: 'When you need the original',
              intro: 'Request eligible physical letters.',
              body: 'UK forwarding of HMRC and Companies House letters is included under the current terms. Other forwarding has separate charges and conditions.',
              href: '/services#forwarding',
            },
          ].map((v, i) => (
            <div className={s.row} key={v.title}>
              <span className={s.number}>0{i + 1}</span>
              <div>
                <h3>{v.title}</h3>
                <p>{v.intro}</p>
              </div>
              <div>
                <p>{v.body}</p>
                <Link className={s.textlink} href={v.href}>
                  Find out more →
                </Link>
              </div>
            </div>
          ))}
          <p>
            <Link href="/services" className={s.textlink}>
              Explore the complete subscription →
            </Link>
          </p>
        </div>
      </section>
      <section className={s.section} id="mail">
        <div className={`${s.wrap} ${s.split}`}>
          <LondonIllustration variant="mail" />
          <div>
            <p className={s.kicker}>Real post. Online convenience.</p>
            <h2>
              From our letterbox
              <br />
              to your screen.
            </h2>
            <p className={s.lead}>Your business correspondence shouldn’t tie you to one place.</p>
            <p>
              View and download available scans in your secure dashboard. Keep track of incoming
              letters, then request physical forwarding when the original matters.
            </p>
            <div className={s.actions}>
              <Link className={s.textlink} href="/services#digital-mail">
                Discover mail scanning →
              </Link>
              <Link className={s.textlink} href="/services#forwarding">
                Forwarding & charges →
              </Link>
            </div>
            <p className={s.note}>
              Letters only. Forwarding charges, retention and account-access conditions apply.
            </p>
          </div>
        </div>
      </section>
      <LondonShowcase />
      <section className={s.section} id="how">
        <div className={s.wrap}>
          <p className={s.kicker}>Start with confidence</p>
          <h2>
            Your London address,
            <br />
            one clear step at a time.
          </h2>
          <div className={s.steps}>
            {[
              [
                'Choose & subscribe',
                'Create your account and choose a monthly or annual subscription.',
              ],
              [
                'Complete your checks',
                'Provide the requested identity and business information, including required owners.',
              ],
              [
                'Get approved & get going',
                'Wait for approval before using the address. Then manage available business mail online.',
              ],
            ].map(([h, p], i) => (
              <div className={s.step} key={h}>
                <span>STEP 0{i + 1}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <Link className={s.textlink} href="/how-it-works">
            See the complete journey →
          </Link>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`} id="pricing">
        <div className={s.wrap}>
          <p className={s.kicker}>Simple subscription. Clear choices.</p>
          <h2>
            One address package.
            <br />
            Choose your billing rhythm.
          </h2>
          <p>
            Address services and digital mail management together. Physical forwarding has separate
            charges and conditions.
          </p>
          <div className={s.pricing}>
            {[
              ['Monthly', monthlyPrice, 'month'],
              ['Annual', annualPrice, 'year'],
            ].map(([name, value, period]) => (
              <div className={s.plan} key={String(name)}>
                <h3>{name} subscription</h3>
                <div className={s.price}>
                  {typeof value === 'number' ? (
                    <>
                      {money(value)} <small>/ {period}</small>
                    </>
                  ) : (
                    <small>Current price unavailable</small>
                  )}
                </div>
                <p>
                  {name === 'Annual' &&
                  monthlyPrice !== null &&
                  annualPrice !== null &&
                  monthlyPrice * 12 > annualPrice
                    ? `Save ${money(monthlyPrice * 12 - annualPrice)} compared with 12 monthly payments.`
                    : 'Choose the billing interval that suits your business.'}
                </p>
                <Link className={s.button} href="/pricing">
                  View plan details →
                </Link>
              </div>
            ))}
          </div>
          <p className={s.note}>
            Review forwarding, renewal and cancellation conditions before subscribing.{' '}
            <Link href="/terms">Read the terms</Link>.
          </p>
        </div>
      </section>
      <section className={s.section}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>Room for your next chapter</p>
            <h2>
              For businesses that
              <br />
              don’t stand still.
            </h2>
          </div>
          <div>
            <p className={s.lead}>
              Starting a company, growing a consultancy or running a business from home? Keep your
              business correspondence organised without renting an office.
            </p>
            <p>
              Eligibility depends on your business and required verification. If you are unsure
              whether the service fits, talk to us before subscribing.
            </p>
            <Link href="/contact" className={s.textlink}>
              Ask us about your business →
            </Link>
          </div>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`} id="faq">
        <div className={`${s.wrap} ${s.faq}`}>
          <p className={s.kicker}>Good questions. Straight answers.</p>
          <h2>
            Before you choose
            <br />
            your virtual office.
          </h2>
          {homepageHelp.map(({ slug, title, summary }) => (
            <details key={slug}>
              <summary>{title}</summary>
              <p>
                {summary}{' '}
                <Link href={`/help/${slug}`} className={s.textlink}>
                  Read more
                </Link>
              </p>
            </details>
          ))}
          <p>
            <Link href="/help" className={s.textlink}>
              Visit the help centre →
            </Link>
          </p>
        </div>
      </section>
      <section className={`${s.section} ${s.ink}`}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>Make your next move</p>
            <h2>
              Your business.
              <br />
              Your London address.
            </h2>
          </div>
          <div>
            <p>
              One subscription for the address services you need and a simpler way to manage
              business post.
            </p>
            <div className={s.actions}>
              <Link className={s.button} href="/signup">
                Get your London address ↗
              </Link>
            </div>
            <p className={s.note}>Subject to payment, required checks and approval.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
