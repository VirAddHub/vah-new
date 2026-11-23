'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Download,
  FileText,
  Inbox,
  MapPin,
  ScanLine,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { usePricing } from '@/hooks/usePlans';
import { formatPrice } from '@/lib/formatPrice';
import styles from './marketing.module.css';

interface HomePageProps {
  onNavigate?: (page: string, data?: { initialBilling: 'monthly' | 'annual' }) => void;
}

const uses = [
  {
    icon: Building2,
    title: 'Registered office',
    text: 'Use the address for your company at Companies House, so your home address stays off the public register.',
    chip: 'Company address',
  },
  {
    icon: User,
    title: "Director's service address",
    text: 'Give officials and the public a business address for you as a director, separate from where you live.',
    chip: 'Director address',
  },
  {
    icon: Inbox,
    title: 'Business post',
    text: 'Letters for your business arrive at the address and are scanned into your online inbox.',
    chip: 'Scanned to inbox',
  },
];

const postFlow = [
  { icon: Building2, title: 'It arrives', text: 'Your business post is delivered to your London address.' },
  { icon: ScanLine, title: 'We scan it', text: 'The letter is opened and scanned, then added to your account.' },
  { icon: Bell, title: 'You see it', text: 'Open it in your dashboard on your phone or computer.' },
  { icon: Send, title: 'You decide', text: 'Download it, keep it organised, or ask for the original to be forwarded.' },
];

const steps = [
  { title: 'Choose how to pay', text: 'Create your account and pick monthly or annual billing.' },
  { title: 'Verify your identity', text: 'Complete the online identity and business checks needed to activate your address.' },
  { title: 'Start using your address', text: 'Once approved, use your London address and manage your post online.' },
];

const included = [
  'Central London business address',
  'Registered office address',
  "Director's service address",
  'Digital mail scanning',
  'Secure online mail dashboard',
];

const faqs = [
  ['What can I use the address for?', 'Once your account is approved and activated, you can use the address for your registered office, director’s service address, HMRC correspondence, invoices and business post.'],
  ['How do I receive my mail?', 'Your business mail is scanned and uploaded to your dashboard. You can view, download and organise your documents online, or request physical forwarding where available.'],
  ['When can I start using my address?', 'After you sign up, complete the required identity and business checks. Your address is ready to use once your account has been approved and activated.'],
  ['Do I need to verify my identity?', 'Yes. You will be guided through online identity verification during onboarding. Depending on your business, you may also need to provide company and business-owner information.'],
  ['Can I request the original document?', 'You can request forwarding for eligible mail from your dashboard. Check the available options and any applicable charges before submitting your request.'],
  ['Can I pay annually?', 'Yes. Choose monthly or annual billing when you sign up. The price for each option is shown above; your selected billing period is carried through to registration.'],
];

function ProductScene() {
  return (
    <figure className={styles.scene} aria-label="Illustrative view of the mail dashboard and app, with sample information">
      <div className={styles.window}>
        <div className={styles.windowBar} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.windowBody}>
          <div className={styles.windowHead}>
            <div>
              <span className={styles.kicker}>Your company</span>
              <strong>Mail inbox</strong>
            </div>
            <span className={styles.activeBadge}><span aria-hidden="true" /> Address active</span>
          </div>
          {([
            ['HMRC', 'Business correspondence', true],
            ['Companies House', 'Company correspondence', false],
            ['Business post', 'Scanned document', false],
          ] as const).map(([sender, subject, isNew]) => (
            <div className={styles.mailRow} key={sender}>
              <span className={styles.mailIcon}><FileText size={16} /></span>
              <div><strong>{sender}</strong><span>{subject}</span></div>
              {isNew ? <span className={styles.newBadge}>New</span> : <span className={styles.readBadge}>Read</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.phone} aria-hidden="true">
        <div className={styles.phoneScreen}>
          <div className={styles.notice}>
            <span className={styles.noticeIcon}><span /></span>
            <div><strong>New letter arrived</strong><span>Scanned and ready to open</span></div>
          </div>
          <div className={styles.scan}>
            <i /><i /><i /><i /><i />
          </div>
          <div className={styles.scanActions}><span><Download size={12} /> Download</span><span><Send size={12} /> Forward</span></div>
        </div>
      </div>

      <div className={styles.officeCard}>
        <span className={styles.kicker}>Registered office</span>
        <strong>Your Company Ltd</strong>
        <span className={styles.officeLine}><MapPin size={13} /> Central London, United Kingdom</span>
      </div>
      <figcaption>Illustrative · sample information</figcaption>
    </figure>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const { monthlyPrice, annualPrice, monthlySavingsPct, loading } = usePricing();

  // Query-based section links leave the existing hash router's page names intact.
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section');
    if (section && ['how', 'pricing', 'mail', 'faq'].includes(section)) {
      document.getElementById(section)?.scrollIntoView();
    }
  }, []);

  const startSignup = (billing: 'monthly' | 'annual' = 'monthly') => {
    if (onNavigate) onNavigate('signup', { initialBilling: billing });
    else router.push(`/signup?billing=${billing}`);
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });

  const shownPrice = annual ? annualPrice : monthlyPrice;

  return (
    <div className={styles.home}>
      <section className={styles.heroWrap}>
        <div className={styles.heroBand} aria-hidden="true" />
        <div className={`${styles.container} ${styles.hero}`}>
          <div className={styles.heroCopy}>
            <span className={styles.pill}><span aria-hidden="true" /> Letters scanned to your phone</span>
            <h1>A London address that runs like an app.</h1>
            <p>Registered office, director’s service address and business post. Every letter scanned into your online inbox.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} onClick={() => startSignup()}>Get your address <ArrowRight size={17} /></button>
              <button className={styles.textButton} onClick={() => scrollTo('mail')}>See how post works</button>
            </div>
            <div className={styles.heroPrice} aria-live="polite">
              {monthlyPrice !== null
                ? <><strong>{formatPrice(monthlyPrice)}/month</strong><span>One plan</span><span>Monthly or annual</span></>
                : loading ? <span className={styles.priceSkeleton} aria-label="Loading price" /> : null}
            </div>
          </div>
          <ProductScene />
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>What you get</span>
          <h2>One address. Three jobs done.</h2>
          <p>Everything a small company needs from an address, managed from one dashboard.</p>
        </div>
        <div className={styles.useGrid}>
          {uses.map(({ icon: Icon, title, text, chip }) => (
            <article className={styles.useCard} key={title}>
              <span className={styles.useIcon}><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className={styles.useChip}><Check size={13} /> {chip}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="mail" className={styles.mistSection}>
        <div className={`${styles.container} ${styles.section}`}>
          <div className={styles.sectionIntro}>
            <span className={styles.eyebrow}>How post works</span>
            <h2>From doormat to dashboard.</h2>
            <p>You don’t need to be in London to keep on top of your company’s post.</p>
          </div>
          <ol className={styles.flow}>
            {postFlow.map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <span className={styles.flowIcon}><Icon size={18} /></span>
                <span className={styles.flowStep}>Step {index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <Link href="/help" className={styles.inlineLink}>Read more about mail handling <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section id="how" className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>Getting started</span>
          <h2>Three steps to your address.</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <article key={step.title}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.mistSection}>
        <div className={`${styles.container} ${styles.section} ${styles.pricingGrid}`}>
          <div className={styles.pricingCopy}>
            <span className={styles.eyebrow}>Pricing</span>
            <h2>One plan. Everything included.</h2>
            <p>The address your company needs and the tools to manage its post. Pay monthly or annually.</p>
            <Link href="/contact" className={styles.inlineLink}>Questions first? Talk to us <ArrowRight size={15} /></Link>
          </div>
          <div className={styles.priceCard}>
            <div className={styles.billingToggle} role="group" aria-label="Billing period">
              <button aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button>
              <button aria-pressed={annual} onClick={() => setAnnual(true)}>Annual{monthlySavingsPct > 0 && <span>Save {monthlySavingsPct}%</span>}</button>
            </div>
            <div className={styles.priceLine} aria-live="polite" aria-atomic="true">
              {shownPrice === null
                ? (loading ? <span className={styles.priceSkeletonLarge} aria-label="Loading price" /> : <strong className={styles.priceUnavailable}>Pricing unavailable</strong>)
                : <><strong>{formatPrice(shownPrice)}</strong><span>/ {annual ? 'year' : 'month'}</span></>}
            </div>
            <p className={styles.billingNote}>{annual ? 'Billed annually' : 'Billed monthly'} · One plan, two ways to pay</p>
            <ul className={styles.featureList}>{included.map(feature => <li key={feature}><Check size={16} /><span>{feature}</span></li>)}</ul>
            <button className={`${styles.primaryButton} ${styles.fullWidth}`} onClick={() => startSignup(annual ? 'annual' : 'monthly')}>Get started <ArrowRight size={17} /></button>
            <p className={styles.priceFootnote}>Address activated after verification and approval. Physical forwarding may incur additional charges.</p>
          </div>
        </div>
      </section>

      <section id="faq" className={`${styles.container} ${styles.section} ${styles.faqSection}`}>
        <div>
          <span className={styles.eyebrow}>FAQs</span>
          <h2>Good questions.</h2>
          <p>Anything else on your mind?</p>
          <Link className={styles.inlineLink} href="/contact">Talk to our team <ArrowRight size={15} /></Link>
        </div>
        <div className={styles.faqList}>
          {faqs.map(([question, answer]) => (
            <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>
          ))}
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.finalBand} aria-hidden="true" />
        <div className={`${styles.container} ${styles.finalInner}`}>
          <div className={styles.finalCopy}>
            <h2>Give your company its own address.</h2>
            <p>Sign up online. We’ll handle the post.</p>
            <button className={styles.whiteButton} onClick={() => startSignup()}>Get your address <ArrowRight size={17} /></button>
          </div>
          <div className={styles.finalCards} aria-hidden="true">
            <div className={styles.finalNotice}>
              <span className={styles.noticeIcon}><span /></span>
              <div><strong>New letter arrived</strong><span>Scanned and ready to open</span></div>
            </div>
            <div className={styles.finalSecure}><ShieldCheck size={16} /> Identity checked before activation</div>
          </div>
        </div>
      </section>
    </div>
  );
}
