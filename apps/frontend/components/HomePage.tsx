'use client';
import Link from 'next/link';
import { usePricing } from '@/hooks/usePlans';
import { homepageHelp } from '@/lib/marketing';
import { LondonIllustration } from './marketing/LondonIllustration';
import s from './marketing/Marketing.module.css';
import p from './marketing/HomepagePricing.module.css';
const money = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
export function HomePage(_props: { onNavigate?: (page: string, data?: any) => void }) {
  const { monthlyPrice, annualPrice, loading } = usePricing();
  const annualSaving =
    monthlyPrice !== null && annualPrice !== null
      ? (Math.round(monthlyPrice * 100) * 12 - Math.round(annualPrice * 100)) / 100
      : 0;
  const unavailableLabel = loading ? 'Loading pricing…' : 'Pricing unavailable';
  return (
    <div className={s.site}>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.split}`}>
          <div>
            <p className={s.kicker}>A London presence. Without the premium price.</p>
            <h1>
              Big ambitions.
              <br />A London business address to match.
            </h1>
            <p className={s.lead}>
              A professional business address by Tower Bridge, London SE1. Registered office,
              director’s service address and digital mail management—all in one subscription.
            </p>
            <div className={p.heroPrices} aria-label="Subscription prices">
              <p className={p.heroMonthly}>
                {monthlyPrice !== null ? (
                  <>
                    <strong>{money(monthlyPrice)}</strong>
                    <span> / month</span>
                  </>
                ) : (
                  <span className={p.unavailable}>{unavailableLabel}</span>
                )}
              </p>
              <p className={p.heroAnnual}>
                {annualPrice !== null ? (
                  <>
                    Or <strong>{money(annualPrice)} a year</strong>, billed annually.
                  </>
                ) : (
                  <>Annual pricing {loading ? 'is loading…' : 'is currently unavailable.'}</>
                )}
              </p>
              <p className={p.billingNote}>Same core service with monthly or annual billing.</p>
            </div>
            <div className={s.actions}>
              {monthlyPrice !== null ? (
                <Link className={s.button} href="/signup?billing=monthly">
                  Get your London address <span aria-hidden>↗</span>
                </Link>
              ) : annualPrice !== null ? (
                <Link className={s.button} href="/signup?billing=annual">
                  Choose annual billing <span aria-hidden>↗</span>
                </Link>
              ) : (
                <button className={`${s.button} ${p.disabled}`} disabled>
                  {unavailableLabel}
                </button>
              )}
              <Link className={s.textlink} href="#pricing">
                Compare billing options ↓
              </Link>
            </div>
            <p className={s.note}>
              Address use begins after successful payment, required checks and approval.
            </p>
          </div>
          <div>
            <LondonIllustration />
            <p className={s.caption}>A little London presence. A lot of freedom.</p>
          </div>
        </div>
      </section>
      <div className={s.band}>
        <div className={s.wrap}>
          <span>Tower Bridge, London SE1</span>
          <span>Registered office & director’s address</span>
          <span>Same-day mail scanning</span>
          <span>One straightforward subscription</span>
        </div>
      </div>
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
              intro: 'One SE1 address for every official use.',
              body: 'Use it for Companies House as your registered office and your director’s service address, and on your website, invoices and letters. All in one subscription, with no add-on fees.',
              href: '/services#london-presence',
            },
            {
              title: 'Your business mail, wherever you are',
              intro: 'Scanned the same working day.',
              body: 'Each letter is opened and scanned the day it arrives. You get an email, then read or download the PDF in your secure dashboard.',
              href: '/services#digital-mail',
            },
            {
              title: 'When you need the original',
              intro: 'We post originals on.',
              body: 'HMRC and Companies House letters are forwarded free within the UK. Other UK letters are £2 each, and international forwarding is quoted when you ask.',
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
      <section
        className={`${s.section} ${p.section}`}
        id="pricing"
        aria-labelledby="home-pricing-title"
      >
        <div className={s.wrap}>
          <div className={p.intro}>
            <div>
              <p className={s.kicker}>A professional address. A straightforward price.</p>
              <h2 id="home-pricing-title">
                Your London presence.
                <br />
                More within reach.
              </h2>
            </div>
            <p className={s.lead}>
              One subscription for your registered office, director’s service address and digital
              mail management. Choose your billing rhythm; the core service stays the same.
            </p>
          </div>
          <div className={p.options}>
            <div className={p.option}>
              <h3>Monthly</h3>
              <p className={p.amount}>
                {monthlyPrice !== null ? (
                  <>
                    <strong>{money(monthlyPrice)}</strong>
                    <span> / month</span>
                  </>
                ) : (
                  <span className={p.unavailable}>{unavailableLabel}</span>
                )}
              </p>
              <p>Billed monthly.</p>
              {monthlyPrice !== null ? (
                <Link className={s.button} href="/signup?billing=monthly">
                  Choose monthly ↗
                </Link>
              ) : (
                <button disabled className={`${s.button} ${p.disabled}`}>
                  {unavailableLabel}
                </button>
              )}
            </div>
            <div className={p.option}>
              <h3>Annual</h3>
              <p className={p.amount}>
                {annualPrice !== null ? (
                  <>
                    <strong>{money(annualPrice)}</strong>
                    <span> / year</span>
                  </>
                ) : (
                  <span className={p.unavailable}>{unavailableLabel}</span>
                )}
              </p>
              <p>
                {annualPrice !== null ? (
                  <>Equivalent to {money(annualPrice / 12)} a month. Billed annually.</>
                ) : (
                  'Annual billing is currently unavailable.'
                )}
              </p>
              {annualPrice !== null ? (
                <Link className={s.button} href="/signup?billing=annual">
                  Choose annual ↗
                </Link>
              ) : (
                <button disabled className={`${s.button} ${p.disabled}`}>
                  {unavailableLabel}
                </button>
              )}
              {annualSaving > 0 && (
                <p className={p.saving}>
                  Save {money(annualSaving)} a year compared with 12 monthly payments.
                </p>
              )}
            </div>
          </div>
          <p className={p.conditions}>
            Both options renew on their billing schedule. Eligibility and approval apply. Optional
            forwarding has separate conditions and charges.{' '}
            <Link href="/pricing">See full pricing details</Link> and{' '}
            <Link href="/terms">renewal and cancellation terms</Link>.
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
            <p className={s.lead}>Your post shouldn’t tie you to one place.</p>
            <p>
              We open, scan and upload your letters the same working day they arrive. Search them,
              download them, and ask us to post an original on when you need it.
            </p>
            <div className={s.actions}>
              <Link className={s.textlink} href="/services#digital-mail">
                Discover mail scanning →
              </Link>
              <Link className={s.textlink} href="/services#forwarding">
                Forwarding & charges →
              </Link>
            </div>
            <p className={s.note}>We handle letters, not parcels.</p>
          </div>
        </div>
      </section>
      <section className={`${s.section} ${s.sage}`} id="why">
        <div className={s.wrap}>
          <p className={s.kicker}>Why VirtualAddressHub</p>
          <h2>
            The essentials, done properly.
            <br />
            Without an office lease.
          </h2>
          {[
            [
              'A recognised London postcode',
              'An address by Tower Bridge in SE1, a short walk from the City, for your company’s public record and your marketing.',
            ],
            [
              'Same-day scanning',
              'Letters are scanned the working day they arrive, so nothing official sits unread.',
            ],
            [
              'One price, everything included',
              'Registered office, director’s service address and mail scanning in one plan, with no letter limits. Choose monthly or annual billing to suit your business.',
            ],
            [
              'Every customer checked',
              'We verify everyone who uses the address, as anti-money-laundering rules require. That keeps the address respectable for every business on it.',
            ],
          ].map(([h, p], i) => (
            <div className={s.row} key={h}>
              <span className={s.number}>0{i + 1}</span>
              <div>
                <h3>{h}</h3>
              </div>
              <div>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
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
                'Once we approve your account you get the full address and can start using it. Your post appears online from then on.',
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
              Sole traders, limited companies, LLPs, overseas founders and companies still being
              formed can all use the service. Not sure it fits? Ask us before you subscribe.
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
            <p className={s.kicker}>Ready when you are</p>
            <h2>
              Apply online today.
              <br />
              We’ll take it from there.
            </h2>
          </div>
          <div>
            <p>
              Choose a plan, verify your identity and tell us about your business. We review every
              application and email you as soon as your address is ready to use.
            </p>
            <div className={s.actions}>
              <Link className={s.button} href="/signup">
                Get your London address ↗
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
