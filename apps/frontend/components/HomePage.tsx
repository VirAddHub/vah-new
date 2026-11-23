'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Building2, Check, ChevronDown, FileText, Inbox, LockKeyhole, Mail, MapPin, ScanLine, Send, ShieldCheck } from 'lucide-react';
import { usePricing } from '@/hooks/usePlans';
import { formatPrice } from '@/lib/formatPrice';
import styles from './marketing.module.css';

interface HomePageProps {
  onNavigate?: (page: string, data?: { initialBilling: 'monthly' | 'annual' }) => void;
}

const benefits = [
  { icon: MapPin, title: 'A London address. Your business.', text: 'A professional address for your registered office, director’s service address and business correspondence.' },
  { icon: ShieldCheck, title: 'Keep home for home.', text: 'Give your business its own address, separate from where you live and spend your time.' },
  { icon: ScanLine, title: 'Your post, wherever you are.', text: 'View scanned mail, download documents and request forwarding from your online dashboard.' },
];

const steps = [
  { title: 'Choose your plan', text: 'Create your account and choose monthly or annual billing.' },
  { title: 'Verify your identity', text: 'Complete the online identity and business checks needed to activate your address.' },
  { title: 'Make yourself at home', text: 'Once approved, start using your London address and manage your post online.' },
];

const features = ['Central London business address', 'Registered office address', 'Director’s service address', 'Digital mail scanning', 'Secure online mail dashboard'];
const faqs = [
  ['What can I use the address for?', 'Once your account is approved and activated, you can use the address for your registered office, director’s service address, HMRC correspondence, invoices and business post.'],
  ['How do I receive my mail?', 'Your business mail is scanned and uploaded to your dashboard. You can view, download and organise your documents online, or request physical forwarding where available.'],
  ['When can I start using my address?', 'After you sign up, complete the required identity and business checks. Your address is ready to use once your account has been approved and activated.'],
  ['Do I need to verify my identity?', 'Yes. You will be guided through online identity verification during onboarding. Depending on your business, you may also need to provide company and business-owner information.'],
  ['Can I request the original document?', 'You can request forwarding for eligible mail from your dashboard. Check the available options and any applicable charges before submitting your request.'],
  ['Can I pay annually?', 'Yes. Choose monthly or annual billing when you sign up. The price for each option is shown above; your selected billing period is carried through to registration.'],
];

function DashboardPreview() {
  return (
    <figure className={styles.preview} aria-label="Illustrative mail dashboard with sample documents">
      <div className={styles.previewBackdrop} aria-hidden="true" />
      <div className={styles.dashboard}>
        <div className={styles.dashboardTop}>
          <span className={styles.previewBrand}><Building2 size={18} /> Your business, connected.</span>
          <span className={styles.avatar}>JD</span>
        </div>
        <div className={styles.dashboardBody}>
          <div className={styles.previewRail} aria-hidden="true"><span><Inbox size={18} /></span><FileText size={18} /><Send size={18} /><Building2 size={18} /></div>
          <div className={styles.previewContent}>
            <div className={styles.previewHeading}><div><span className={styles.smallLabel}>YOUR WORKSPACE</span><h3>Good morning, Jamie.</h3></div><span className={styles.avatarSmall}>J</span></div>
            <div className={styles.addressCard}><MapPin size={19} /><div><span>Your business address</span><strong>Central London, United Kingdom</strong></div><span className={styles.status}>Active</span></div>
            <div className={styles.inboxHeading}><strong>Your mail</strong><span>3 documents</span></div>
            {[
              ['Companies House', 'Company correspondence', 'New'],
              ['HMRC', 'Business correspondence', 'New'],
              ['Business post', 'Scanned document', 'Read'],
            ].map(([sender, subject, status]) => (
              <div className={styles.mailRow} key={sender}><span className={styles.mailIcon}><FileText size={17} /></span><div><strong>{sender}</strong><span>{subject}</span></div><span className={status === 'New' ? styles.newBadge : styles.readBadge}>{status}</span></div>
            ))}
            <div className={styles.previewBottom}><LockKeyhole size={12} /> All your business post. One secure place.</div>
          </div>
        </div>
      </div>
      <div className={styles.floatingNote}><span><Check size={18} /></span><div><strong>A little more peace of mind.</strong><p>Your business has its own address.</p></div></div>
      <figcaption>Illustrative dashboard · sample information</figcaption>
    </figure>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const { monthlyPrice, annualPrice, monthlySavingsPct } = usePricing();

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

  return (
    <div className={styles.home}>
      <section className={`${styles.container} ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <h1>Your business deserves a <span>professional address.</span></h1>
          <p>A Central London address for your business. Your post, managed online. More freedom to work from wherever you call home.</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} onClick={() => startSignup()}>Get your address <ArrowUpRight size={18} /></button>
            <button className={styles.textButton} onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>See how it works <ArrowDown size={16} /></button>
          </div>
          {monthlyPrice !== null && <div className={styles.heroPrice}>From <strong>{formatPrice(monthlyPrice)}/month</strong><span>Monthly and annual plans</span></div>}
        </div>
        <DashboardPreview />
      </section>

      <div className={styles.benefitStrip}><div className={styles.container}>{['Registered office address', 'Director’s service address', 'Digital mail access', 'UK business presence'].map(item => <span key={item}><Check size={15} />{item}</span>)}</div></div>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionIntro}><div><span className={styles.eyebrow}>SMALL DETAILS. BIG DIFFERENCE.</span><h2>A proper home for<br />your business.</h2></div><p>Build your business on your terms.<br />We’ll take care of the address and the post.</p></div>
        <div className={styles.benefitGrid}>{benefits.map(({ icon: Icon, title, text }) => <article className={styles.benefitCard} key={title}><span className={styles.featureIcon}><Icon size={23} strokeWidth={1.5} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section id="mail" className={styles.softSection}>
        <div className={`${styles.container} ${styles.mailSection}`}>
          <div className={styles.documentScene} aria-label="Illustrative scanned mail document">
            <div className={styles.documentToolbar}><span><FileText size={16} /> Your mail, digitised.</span><span>PDF</span></div>
            <div className={styles.documentPaper}><div className={styles.paperMark}><Building2 size={26} /><span>BUSINESS<br />CORRESPONDENCE</span></div><span className={styles.sampleTag}>SAMPLE DOCUMENT</span><div className={styles.paperTitle}>Good things are<br />coming your way.</div><div className={styles.paperLines} aria-hidden="true"><i /><i /><i /><i /><i /></div><div className={styles.paperSignature}>Your business. Your next chapter.</div></div>
            <span className={styles.documentCaption}><LockKeyhole size={14} /> Available securely in your dashboard</span>
          </div>
          <div className={styles.mailCopy}><span className={styles.eyebrow}>LESS PAPERWORK. MORE POSSIBILITY.</span><h2>Your post.<br />Minus the postcode.</h2><p>Being away from the office shouldn’t mean being out of the loop. Keep your business correspondence close, wherever work takes you.</p><ul className={styles.featureList}><li><Check size={17} /><span>Read and download your scanned mail online.</span></li><li><Check size={17} /><span>Keep everything organised with tags and archives.</span></li><li><Check size={17} /><span>Request the original when you need it.</span></li></ul><Link href="/help" className={styles.textButton}>Explore mail management <ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <section id="how" className={`${styles.container} ${styles.section}`}>
        <div className={styles.centerIntro}><span className={styles.eyebrow}>A SIMPLE START</span><h2>Your next chapter starts here.</h2><p>From sign-up to your first piece of post, we’ll guide you through.</p></div>
        <div className={styles.steps}>{steps.map((step, index) => <article key={step.title}><div className={styles.stepNumber}>0{index + 1}<span /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section id="pricing" className={styles.pricingSection}><div className={`${styles.container} ${styles.pricingGrid}`}>
        <div className={styles.pricingCopy}><span className={styles.eyebrow}>ONE ADDRESS. EVERYTHING CONNECTED.</span><h2>A small step.<br />A more professional<br />presence.</h2><p>The address your business needs, with the tools to manage your mail. Choose the billing period that works for you.</p><Link href="/contact" className={styles.textButton}>Have a question? Let’s talk <ArrowUpRight size={17} /></Link></div>
        <div className={styles.priceCard}><div className={styles.planHeading}><span className={styles.planIcon}><Building2 size={22} /></span><div><h3>Your London address</h3><p>For your business and what comes next.</p></div></div>
          <div className={styles.billingToggle} role="group" aria-label="Billing period"><button aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button><button aria-pressed={annual} onClick={() => setAnnual(true)}>Annual{monthlySavingsPct > 0 && <span>Save {monthlySavingsPct}%</span>}</button></div>
          <div className={styles.priceLine} aria-live="polite" aria-atomic="true">{(annual ? annualPrice : monthlyPrice) === null ? <strong>Pricing unavailable</strong> : <><strong>{formatPrice((annual ? annualPrice : monthlyPrice) as number)}</strong><span>/ {annual ? 'year' : 'month'}</span></>}</div><p className={styles.billingNote}>{annual ? 'Billed annually' : 'Billed monthly'} · One plan, two ways to pay</p>
          <ul className={styles.featureList}>{features.map(feature => <li key={feature}><Check size={17} /><span>{feature}</span></li>)}</ul>
          <button className={styles.primaryButton} onClick={() => startSignup(annual ? 'annual' : 'monthly')}>Get started <ArrowUpRight size={18} /></button><p className={styles.priceFootnote}>Address activated after verification and approval.<br />Physical forwarding may incur additional charges.</p>
        </div>
      </div></section>

      <section id="faq" className={`${styles.container} ${styles.section} ${styles.faqSection}`}><div><span className={styles.eyebrow}>GOOD QUESTIONS</span><h2>A little clarity<br />before you start.</h2><p>Anything else on your mind?</p><Link className={styles.textButton} href="/contact">Talk to our team <ArrowUpRight size={17} /></Link></div><div className={styles.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>

      <section className={styles.finalSection}><div className={styles.container}><div className={styles.finalIcon}><Mail size={27} strokeWidth={1.5} /></div><span className={styles.eyebrow}>YOUR BUSINESS BELONGS HERE</span><h2>A London address.<br />Your next big move.</h2><p>Make room for what’s next. We’ll handle the post.</p><button className={styles.primaryButton} onClick={() => startSignup()}>Get your address <ArrowUpRight size={18} /></button></div></section>
    </div>
  );
}
