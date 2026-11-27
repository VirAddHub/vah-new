'use client';
import Link from 'next/link';
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
          <p className={m.kicker}>YOUR BUSINESS, BASED IN LONDON</p>
          <h1>
            One London address.
            <br />
            One straightforward subscription.
          </h1>
          <div className={s.introLine}>
            <p className={m.lead}>
              A professional business presence. Your letters, online.
              <br />
              Choose how you pay. The core service stays the same.
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
                Recurring monthly subscription. Cancellation conditions apply.
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
                  'Same core service, paid annually. Cancellation conditions apply.'
                )}
              </p>
            </div>
          </div>
          <p className={s.purchaseNote}>
            Both options renew on their billing schedule. Review the{' '}
            <Link href="/terms">renewal and cancellation terms</Link> before subscribing. Address
            use starts after successful payment, required verification and account approval.
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
              No separate subscriptions for each address use. Monthly and annual billing include the
              same core services.
            </p>
            <Link className={m.textlink} href="/services">
              Explore our services →
            </Link>
          </div>
          <dl className={s.featureList}>
            <div>
              <dt>A Central London business presence</dt>
              <dd>
                A professional correspondence address that keeps business post separate from home.
              </dd>
            </div>
            <div>
              <dt>Registered office & director’s service address</dt>
              <dd>Address use for eligible companies and directors, following approval.</dd>
            </div>
            <div>
              <dt>Digital mail scanning</dt>
              <dd>Read available correspondence online, wherever you work.</dd>
            </div>
            <div>
              <dt>Your secure customer dashboard</dt>
              <dd>View and download available scans and manage your business post in one place.</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className={s.decision}>
        <div className={`${m.wrap} ${s.featureLayout}`}>
          <div>
            <p className={m.kicker}>BEFORE YOU SUBSCRIBE</p>
            <h2>A clear next step.</h2>
            <p>See what happens from choosing a plan to opening your first available scan.</p>
            <Link className={m.textlink} href="/how-it-works">
              How it works →
            </Link>
          </div>
          <div className={s.questions}>
            <details>
              <summary>When can I use my address?</summary>
              <p>
                After successful payment, required identity and business checks, and account
                approval. Full address details are provided in your account.
              </p>
            </details>
            <details>
              <summary>Can I receive original letters?</summary>
              <p>
                Optional physical forwarding is available, subject to eligibility, retention
                conditions and applicable charges.{' '}
                <Link href="/services#forwarding">Review forwarding conditions and charges</Link>{' '}
                before subscribing.
              </p>
            </details>
            <details>
              <summary>What should I check before subscribing?</summary>
              <p>
                Confirm the address is suitable for your business and company jurisdiction. Read the{' '}
                <Link href="/terms">service, renewal and cancellation terms</Link>, or{' '}
                <Link href="/contact">ask us about eligibility</Link>.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
