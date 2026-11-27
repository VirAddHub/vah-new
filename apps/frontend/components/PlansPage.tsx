'use client';
import Link from 'next/link';
import { pricingFaq } from '@/lib/marketing';
import { usePricing } from '@/hooks/usePlans';
import m from './marketing/Marketing.module.css';
import s from './marketing/PurchaseJourney.module.css';
interface PlansPageProps {
  onNavigate: (page: string, data?: { initialBilling: 'monthly' | 'annual' }) => void;
}
const money = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
export function PlansPage({ onNavigate }: PlansPageProps) {
  const { monthlyPrice, annualPrice, loading, error } = usePricing();
  const savings =
    monthlyPrice !== null && annualPrice !== null
      ? (Math.round(monthlyPrice * 100) * 12 - Math.round(annualPrice * 100)) / 100
      : 0;
  return (
    <div className={`${m.site} ${s.page}`}>
      <section className={s.pricingHero}>
        <div className={m.wrap}>
          <p className={m.kicker}>PRICING · TOWER BRIDGE, LONDON SE1</p>
          <h1>
            One London address.
            <br />
            One straightforward subscription.
          </h1>
          <div className={s.introLine}>
            <p className={m.lead}>
              Your registered office, director’s service address and same-day mail scanning, in one
              plan with no letter limits. Choose how you pay; the service is the same.
            </p>
            <Link className={m.textlink} href="#included">
              See everything included ↓
            </Link>
          </div>
        </div>
      </section>
      <section className={s.billingSection} aria-label="Subscription billing options">
        <div className={m.wrap}>
          {error && (
            <p role="status" className={s.notice}>
              Some pricing is temporarily unavailable. Please refresh before subscribing.
            </p>
          )}
          <div className={s.billing}>
            <div className={s.option}>
              <p className={m.kicker}>01 / MONTHLY BILLING</p>
              <h2>A month at a time.</h2>
              <p className={s.price}>
                {monthlyPrice === null ? (
                  <span className={s.unavailable}>
                    {loading ? 'Loading pricing…' : 'Pricing unavailable'}
                  </span>
                ) : (
                  <>
                    {money(monthlyPrice)}
                    <span> / month</span>
                  </>
                )}
              </p>
              <p>Billed monthly. The complete core service.</p>
              <button
                className={m.button}
                disabled={monthlyPrice === null}
                onClick={() => onNavigate('signup', { initialBilling: 'monthly' })}
              >
                Choose monthly <span aria-hidden>↗</span>
              </button>
              <p className={s.fine}>
                Renews monthly. Cancel any time with 30 days’ notice.
              </p>
            </div>
            <div className={`${s.option} ${s.annual}`}>
              <p className={m.kicker}>02 / ANNUAL BILLING{savings > 0 ? ' — BETTER VALUE' : ''}</p>
              <h2>A year of London presence.</h2>
              <p className={s.price}>
                {annualPrice === null ? (
                  <span className={s.unavailable}>
                    {loading ? 'Loading pricing…' : 'Pricing unavailable'}
                  </span>
                ) : (
                  <>
                    {money(annualPrice)}
                    <span> / year</span>
                  </>
                )}
              </p>
              <p>
                {annualPrice !== null ? (
                  <>Equivalent to {money(annualPrice / 12)} a month. Billed annually.</>
                ) : (
                  'Annual billing is currently unavailable.'
                )}
              </p>
              <button
                className={m.button}
                disabled={annualPrice === null}
                onClick={() => onNavigate('signup', { initialBilling: 'annual' })}
              >
                Choose annual <span aria-hidden>↗</span>
              </button>
              <p className={s.fine}>
                {savings > 0 ? (
                  <>Save {money(savings)} a year compared with 12 monthly payments.</>
                ) : (
                  'Same service, paid yearly.'
                )}
              </p>
            </div>
          </div>
          <p className={s.purchaseNote}>
            You can start using the address once you have paid, verified your identity and we have
            approved your account. <Link href="/terms">Full terms</Link>.
          </p>
        </div>
      </section>
      <section id="included" className={s.included}>
        <div className={`${m.wrap} ${s.featureLayout}`}>
          <div>
            <p className={m.kicker}>ONE SUBSCRIPTION / ALL CONNECTED</p>
            <h2>
              Your business address.
              <br />
              And the post that comes with it.
            </h2>
            <p>
              Everything you need for an official London address is in the one plan. Nothing is
              sold as an add-on, and there is no cap on how many letters you receive.
            </p>
            <Link className={m.textlink} href="/services">
              Explore our services →
            </Link>
          </div>
          <dl className={s.featureList}>
            <div>
              <dt>A London SE1 business address</dt>
              <dd>
                By Tower Bridge, for your website, invoices and letters. Your home address stays
                private.
              </dd>
            </div>
            <div>
              <dt>Registered office & director’s service address</dt>
              <dd>
                For Companies House: your company’s registered office (England and Wales) and each
                director’s service address. No extra fee.
              </dd>
            </div>
            <div>
              <dt>Same-day mail scanning</dt>
              <dd>Every letter opened and scanned the working day it arrives, with an email to tell you.</dd>
            </div>
            <div>
              <dt>Your secure customer dashboard</dt>
              <dd>Read, search and download your scans, and ask for originals, from one place.</dd>
            </div>
            <div>
              <dt>Forwarding of originals</dt>
              <dd>
                HMRC and Companies House letters forwarded free within the UK. Other UK letters £2
                each. International forwarding quoted on request. Originals are kept for 30 days.
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <section className={m.section} aria-labelledby="compare">
        <div className={m.wrap}>
          <p className={m.kicker}>HOW WE COMPARE</p>
          <h2 id="compare">
            Less than most London providers.
            <br />
            With more included.
          </h2>
          <div className={s.compareWrap}>
            <table className={s.compare}>
              <caption className="sr-only">What a London virtual office typically includes, compared with VirtualAddressHub</caption>
              <thead>
                <tr><th scope="col"></th><th scope="col">VirtualAddressHub</th><th scope="col">Typical London provider</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Monthly price</th><td>{monthlyPrice !== null ? money(monthlyPrice) : '—'}</td><td>£20 to £30, often plus VAT</td></tr>
                <tr><th scope="row">Director’s service address</th><td>Included</td><td>Often an extra monthly fee</td></tr>
                <tr><th scope="row">Mail scanning</th><td>Same working day</td><td>Within one working day, or an add-on</td></tr>
                <tr><th scope="row">Letter limit</th><td>None</td><td>Some plans cap letters each month</td></tr>
                <tr><th scope="row">HMRC and Companies House forwarding</th><td>Free in the UK</td><td>Postage plus a handling fee</td></tr>
              </tbody>
            </table>
          </div>
          <p className={s.fine}>Typical prices from published London virtual office plans, November 2026.</p>
        </div>
      </section>
      <section className={s.decision} aria-labelledby="pricing-faq">
        <div className={`${m.wrap} ${s.featureLayout}`}>
          <div>
            <p className={m.kicker}>QUESTIONS</p>
            <h2 id="pricing-faq">Before you subscribe.</h2>
            <p>
              Still unsure? <Link href="/contact">Ask us</Link>: we reply the same working day.
            </p>
            <Link className={m.textlink} href="/how-it-works">
              How it works →
            </Link>
          </div>
          <div className={s.questions}>
            {pricingFaq.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
