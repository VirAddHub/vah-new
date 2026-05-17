'use client';

import { useState } from 'react';
import { usePricing } from '@/hooks/usePlans';
import { formatMonthly, formatAnnual } from '@/lib/formatPrice';

interface HomePageProps {
  onNavigate?: (page: string, data?: any) => void;
}

// ─── Before card ───────────────────────────────────────────────────────────
function MixBeforeCard() {
  return (
    <div className="bg-mix-paper-deep border border-dashed border-mix-rule p-5 sm:p-7 relative">
      <div className="flex items-center justify-between mb-3 font-plex text-[10px] sm:text-[11px] text-mix-muted tracking-[0.12em] uppercase">
        <span>— Previously —</span>
        <span>Visible to anyone</span>
      </div>
      <div className="font-newsreader text-[20px] sm:text-[24px] text-mix-ink2 leading-[1.35]">
        Your home address
      </div>
      <div className="mt-3 pt-3 border-t border-dotted border-mix-rule font-newsreader text-[13px] sm:text-[14px] text-mix-muted">
        On the public Companies House register. For anyone to find.
      </div>
    </div>
  );
}

// ─── After card ────────────────────────────────────────────────────────────
function MixAfterCard() {
  const features = ['Companies House', 'HMRC', "Director's address", 'Digital mail access'];
  return (
    <div
      className="bg-mix-paper-light relative border border-mix-rule p-5 sm:p-8"
      style={{ boxShadow: '0 24px 50px -28px rgba(60,40,10,0.35)' }}
    >
      <div
        className="absolute -top-3 right-4 sm:right-6 bg-mix-stamp text-mix-paper-light px-2.5 py-1 font-plex text-[9px] sm:text-[10px] tracking-[0.15em] uppercase"
        style={{ transform: 'rotate(2deg)' }}
      >
        Apply online
      </div>

      <div className="flex items-center justify-between mb-3 font-plex text-[10px] sm:text-[11px] tracking-[0.12em] uppercase">
        <span className="text-mix-green">— From now on —</span>
        <span className="text-mix-muted">Central London</span>
      </div>

      <div className="font-newsreader text-[20px] sm:text-[24px] text-mix-ink leading-[1.4]">
        Your Business, Ltd.<br />
        <span className="text-mix-green text-[18px] sm:text-[22px]">Central London business address</span>
      </div>

      <div className="mt-4 pt-3 border-t border-dotted border-mix-rule grid grid-cols-2 gap-x-3 gap-y-1.5 font-dmsans text-[12px] sm:text-[13px] text-mix-ink2">
        {features.map((t) => (
          <div key={t} className="flex gap-1.5">
            <span className="text-mix-green font-newsreader">✓</span> {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function MixHero({ onNavigate }: { onNavigate?: (p: string, d?: any) => void }) {
  return (
    <section className="bg-mix-paper px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center relative overflow-hidden">
      <div>
        <h1
          className="font-newsreader text-mix-ink m-0 leading-[1.05] tracking-[-0.025em] font-normal"
          style={{ fontSize: 'clamp(30px, 4.5vw, 58px)' }}
        >
          Virtual business address<br />
          <span className="text-mix-green">in Central London.</span>
        </h1>

        <p
          className="font-newsreader text-mix-ink2 font-light leading-[1.72] mt-5 max-w-[500px]"
          style={{ fontSize: 'clamp(15px, 1.4vw, 17px)' }}
        >
          Get a Central London virtual business address for Companies House, HMRC, director service address use, invoices and business post — without renting an office or using your home address.
        </p>

        <div className="flex items-center gap-5 mt-8 flex-wrap">
          <button
            onClick={() => onNavigate?.('signup', { initialBilling: 'monthly' })}
            className="inline-flex items-center gap-2 bg-mix-green text-mix-paper-light px-6 py-3.5 sm:px-7 sm:py-4 rounded font-dmsans font-medium text-[14px] sm:text-[15px] hover:bg-mix-green-deep transition-colors"
          >
            Claim your address
            <span className="font-newsreader">→</span>
          </button>
        </div>

        <div className="mt-7">
          <div className="font-newsreader text-[22px] sm:text-[26px] text-mix-green leading-none tracking-[-0.02em]">
            One simple price: £9.99/month.
          </div>
          <div className="font-dmsans text-[13px] sm:text-[14px] text-mix-ink2 mt-2 leading-[1.7]">
            No setup fee. No joining fee. No hidden extras.<br />
            Everything included in your plan.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <MixBeforeCard />
        <div className="font-newsreader text-[28px] sm:text-[32px] text-mix-green text-center leading-none py-1">↓</div>
        <MixAfterCard />
      </div>
    </section>
  );
}

// ─── Use one address for ────────────────────────────────────────────────────
const USE_FOR_FEATURES = [
  'Companies House use',
  'HMRC correspondence',
  "Director's service address",
  'Secure digital mail access',
];

function MixUseFor() {
  return (
    <section id="uses" className="bg-mix-paper-deep px-6 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
      <div className="max-w-[780px] mx-auto text-center">

        <h2
          className="font-newsreader text-mix-ink m-0 font-normal leading-[1.15] tracking-[-0.025em]"
          style={{ fontSize: 'clamp(28px, 4vw, 50px)' }}
        >
          One Central London address for{' '}
          <span className="text-mix-green">Companies House</span>,{' '}
          <span className="text-mix-green">HMRC</span>{' '}
          and <span className="text-mix-green">business mail</span>.
        </h2>

        {/* Divider */}
        <div className="w-14 mx-auto mt-7 mb-7" style={{ height: '1px', background: '#D7CDB6' }} />

        <p className="font-dmsans text-[15px] sm:text-[16px] text-mix-ink2 leading-[1.8]">
          Protect your home address and manage official business post online with a professional UK address built for company founders, directors, freelancers and overseas entrepreneurs.
        </p>
        <p className="font-dmsans text-[15px] sm:text-[16px] text-mix-ink2 leading-[1.8] mt-4">
          Use it as your registered office address, director&apos;s service address, HMRC correspondence address and everyday business address.
        </p>

        {/* Dot rows */}
        <div className="mt-9 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {USE_FOR_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: '#1F4934' }} />
              <span className="font-dmsans text-[13px] sm:text-[14px] text-mix-ink2">{f}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    n: '1',
    t: 'Apply online',
    d: 'Create your account and complete a quick identity check.',
  },
  {
    n: '2',
    t: 'Start using your address',
    d: 'Once approved, use your Central London address for Companies House, HMRC, invoices and business correspondence.',
  },
  {
    n: '3',
    t: 'Manage your mail online',
    d: 'Your business mail is scanned and uploaded securely to your online dashboard.',
  },
];

function MixHow() {
  return (
    <section id="how" className="bg-mix-paper px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20">
      <div className="text-center mb-8 sm:mb-12">
        <h2
          className="font-newsreader text-mix-ink m-0 tracking-[-0.02em] font-normal leading-none"
          style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
        >
          Get your virtual business address{' '}
          <span className="text-mix-green">in three steps.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-[1080px] mx-auto">
        {HOW_STEPS.map((s) => (
          <div key={s.n} className="bg-mix-paper-deep border border-mix-rule p-7 sm:p-10">
            <div className="font-newsreader text-[40px] sm:text-[52px] text-mix-green leading-none mb-4">{s.n}.</div>
            <h3 className="font-newsreader text-[18px] sm:text-[21px] text-mix-ink m-0 font-medium">{s.t}</h3>
            <p className="font-newsreader text-[14px] sm:text-[16px] text-mix-ink2 leading-[1.65] mt-3">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


// ─── One plan + pricing ────────────────────────────────────────────────────
const PLAN_FEATURES = [
  ['Registered Office address',      'Use our address as your official registered office with Companies House.'],
  ["Director's Service Address",     'Keep your personal address off the public register — use ours instead.'],
  ['Professional business address',  'For your website, invoices, contracts and client communications.'],
  ['Same-day mail scanning',         'Mail received before our daily cut-off is scanned and uploaded the same working day.'],
  ['Secure online dashboard',        'View, download and organise your mail in one place, from anywhere.'],
  ['UK based support',               'Our team is available Monday to Friday, 9am–6pm.'],
  ['Privacy protection',             'Your home address stays your home address.'],
] as const;

const TORN_PAPER_CLIP =
  'polygon(0 0, 100% 0, 100% calc(100% - 16px), 96% 100%, 92% calc(100% - 12px), 88% 100%, 84% calc(100% - 14px), 80% 100%, 76% calc(100% - 12px), 72% 100%, 68% calc(100% - 14px), 64% 100%, 60% calc(100% - 12px), 56% 100%, 52% calc(100% - 14px), 48% 100%, 44% calc(100% - 12px), 40% 100%, 36% calc(100% - 14px), 32% 100%, 28% calc(100% - 12px), 24% 100%, 20% calc(100% - 14px), 16% 100%, 12% calc(100% - 12px), 8% 100%, 4% calc(100% - 14px), 0 100%)';

const CARD_FEATURES = [
  'Registered Office address',
  "Director's Service Address",
  'Professional business address',
  'Same-day mail scanning',
  'Secure online dashboard',
];

function MixPlan({ onNavigate }: { onNavigate?: (p: string, d?: any) => void }) {
  const [annual, setAnnual] = useState(false);
  const { monthlyPrice, annualPrice } = usePricing();

  const displayPrice = annual ? formatAnnual(annualPrice) : formatMonthly(monthlyPrice);
  const cadence = annual ? '/ year' : '/ month';

  return (
    <section id="pricing" className="bg-mix-paper px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20">
      <div className="max-w-[1180px] mx-auto">

        {/* Heading */}
        <div className="mb-8 sm:mb-12">
          <h2
            className="font-newsreader text-mix-ink m-0 tracking-[-0.02em] font-normal leading-[1.05]"
            style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}
          >
            One plan. £9.99/month.<br />
            <span className="text-mix-green">Everything included.</span>
          </h2>
          <p className="font-dmsans text-[14px] sm:text-[15px] text-mix-ink2 leading-[1.6] mt-4 max-w-[520px] font-medium">
            No tiers. No confusing packages. No surprise add-ons.
          </p>
        </div>

        {/* Two-col: feature list left, pricing card right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-start">

          {/* Feature list */}
          <div>
            {PLAN_FEATURES.map(([t, d], i) => (
              <div
                key={t}
                className="grid py-4 sm:py-5 gap-x-1"
                style={{
                  gridTemplateColumns: '32px 1fr',
                  borderTop: i === 0 ? 'none' : '1px solid #D7CDB6',
                }}
              >
                <div className="font-plex text-[11px] text-mix-muted pt-1.5">0{i + 1}</div>
                <div>
                  <h3 className="font-newsreader text-[16px] sm:text-[18px] text-mix-ink m-0 font-medium">{t}</h3>
                  <p className="font-newsreader text-[14px] sm:text-[15px] text-mix-ink2 mt-1.5 leading-[1.65] m-0">{d}</p>
                </div>
              </div>
            ))}

            {/* Inline CTA */}
            <div className="mt-8 pt-8 border-t border-mix-rule">
              <p className="font-newsreader text-[15px] sm:text-[16px] text-mix-ink2 mb-4">
                Ready to protect your home address?
              </p>
              <button
                onClick={() => onNavigate?.('signup', { initialBilling: 'monthly' })}
                className="inline-flex items-center gap-2 bg-mix-green text-mix-paper-light px-5 py-3 rounded font-dmsans font-medium text-[13px] sm:text-[14px] hover:bg-mix-green-deep transition-colors"
              >
                Get started today
                <span className="font-newsreader">→</span>
              </button>
            </div>
          </div>

          {/* Pricing card — sticky on desktop */}
          <div className="lg:sticky lg:top-24">
            <div
              className="bg-mix-paper-deep text-mix-ink font-plex text-[13px] px-5 sm:px-8 pt-7 pb-12 relative"
              style={{ clipPath: TORN_PAPER_CLIP }}
            >
              {/* Toggle */}
              <div className="flex p-[3px] mb-5 border border-mix-rule" style={{ background: '#D7CDB6' }}>
                {[
                  { label: 'Monthly',           val: false },
                  { label: 'Annual · save 17%', val: true  },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    onClick={() => setAnnual(val)}
                    className="flex-1 py-2.5 px-2 sm:px-3.5 border-none cursor-pointer font-plex text-[10px] sm:text-[11px] font-medium tracking-[0.06em] sm:tracking-[0.08em] uppercase transition-all duration-200"
                    style={{
                      background: annual === val ? '#1F4934' : 'transparent',
                      color: annual === val ? '#FBF6E9' : '#3D362C',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mt-1 mb-6">
                <span
                  className="font-newsreader text-mix-ink leading-none tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(48px, 8vw, 72px)' }}
                >
                  {displayPrice}
                </span>
                <span className="font-newsreader text-[15px] sm:text-[18px] text-mix-muted">{cadence}</span>
              </div>

              {/* Feature rows */}
              {CARD_FEATURES.map((t) => (
                <div key={t} className="flex justify-between py-2 border-b border-dotted border-mix-rule text-[12px] sm:text-[13px]">
                  <span className="text-mix-ink2">{t}</span>
                  <span className="text-mix-green shrink-0 ml-2">✓</span>
                </div>
              ))}

              {/* No setup fee note */}
              <div className="mt-4 font-plex text-[11px] text-mix-muted text-center tracking-[0.05em]">
                No setup fee. Cancel anytime.
              </div>

              {/* CTA */}
              <button
                onClick={() => onNavigate?.('signup', { initialBilling: annual ? 'annual' : 'monthly' })}
                className="block w-full text-center mt-4 bg-mix-ink text-mix-paper-light py-3.5 font-dmsans text-[13px] sm:text-[14px] tracking-[0.02em] hover:opacity-90 transition-opacity"
              >
                Sign up — start today
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Who it's for ──────────────────────────────────────────────────────────
const FOR_WHOM = [
  { label: 'Starting out',  t: 'Company founders',       d: 'Use a professional address from day one.' },
  { label: 'Privacy',       t: 'Directors',              d: 'Keep your personal address off public records.' },
  { label: 'Remote',        t: 'Remote businesses',      d: 'Run your company without renting office space.' },
  { label: 'UK presence',   t: 'Overseas entrepreneurs', d: 'Create a professional UK business presence.' },
] as const;

function MixForWhom() {
  return (
    <section id="who" className="bg-mix-paper px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20">
      <div className="max-w-[860px] mx-auto">
        <h2
          className="font-newsreader text-mix-ink m-0 tracking-[-0.02em] font-normal leading-[1.05] mb-8 sm:mb-12"
          style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}
        >
          Built for <span className="text-mix-green">modern UK businesses.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {FOR_WHOM.map(({ label, t, d }) => (
            <div
              key={t}
              className="bg-mix-paper-deep border border-mix-rule p-6 sm:p-8"
              style={{ borderTop: '2px solid rgba(31, 73, 52, 0.35)' }}
            >
              <div className="font-plex text-[10px] sm:text-[11px] tracking-[0.14em] uppercase mb-3" style={{ color: '#1F4934' }}>
                {label}
              </div>
              <h3 className="font-newsreader text-[17px] sm:text-[19px] text-mix-ink m-0 font-medium">{t}</h3>
              <p className="font-newsreader text-[14px] sm:text-[15px] text-mix-ink2 mt-2 leading-[1.6] m-0">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  [
    'Can I use this address for Companies House?',
    "Yes. Our Central London address is accepted as a registered office address for company registration at Companies House.",
  ],
  [
    'Can I use the address for HMRC?',
    "Yes. You can use the address for all HMRC correspondence, including tax registration and VAT registration.",
  ],
  [
    "Can I use this as a director's service address?",
    "Yes. The address can be used as a director's service address, keeping your personal address off the public Companies House register.",
  ],
  [
    'What happens to my business post?',
    'Business mail is opened, scanned front and back, and uploaded securely to your dashboard. You can view, download, archive or request forwarding where available.',
  ],
  [
    'When can I start using the address?',
    'You can apply online in minutes. Once your identity check is approved, your address is activated and ready to use.',
  ],
  [
    'Do I need to complete an identity check?',
    'Yes. As a registered anti-money laundering supervised business, we are required to verify the identity of all customers before activating an address. This is a quick online process.',
  ],
  [
    'Can I cancel anytime?',
    'Yes. There are no long contracts. You can cancel your plan anytime from your account or by contacting support.',
  ],
] as const;

function MixFAQ() {
  const [openIdx, setOpenIdx] = useState<number>(0);

  return (
    <section id="faq" className="bg-mix-paper-deep px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2
            className="font-newsreader text-mix-ink m-0 tracking-[-0.025em] font-normal leading-[1.05]"
            style={{ fontSize: 'clamp(26px, 3.5vw, 46px)' }}
          >
            The <span className="text-mix-green">honest</span> questions.
          </h2>
          <p className="font-newsreader text-[14px] sm:text-[16px] text-mix-ink2 mt-3">
            And the honest answers.
          </p>
        </div>

        <div>
          {FAQ_ITEMS.map(([q, a], i) => (
            <div key={i} className="border-t border-mix-rule">
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                className="bg-transparent border-none cursor-pointer py-4 sm:py-5 w-full flex items-baseline gap-3 sm:gap-6 text-left"
              >
                <div className="hidden sm:block font-plex text-[12px] text-mix-muted tracking-[0.1em] shrink-0 pt-1 w-10">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 font-newsreader text-[16px] sm:text-[20px] text-mix-ink font-medium tracking-[-0.015em] leading-[1.3]">
                  {q}
                </div>
                <div
                  className="font-newsreader text-[22px] sm:text-[26px] text-mix-green leading-none shrink-0 transition-transform duration-[250ms]"
                  style={{
                    transform: openIdx === i ? 'rotate(45deg)' : 'none',
                    transformOrigin: 'center',
                  }}
                >
                  +
                </div>
              </button>

              {openIdx === i && (
                <div className="pb-5 sm:pb-6 sm:pl-16">
                  <p className="font-newsreader text-[14px] sm:text-[16px] leading-[1.75] sm:leading-[1.65] text-mix-ink2 m-0">
                    {a}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-mix-rule" />
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────
function MixCTA({ onNavigate }: { onNavigate?: (p: string, d?: any) => void }) {
  return (
    <section className="bg-mix-paper px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-24 text-center">
      <div className="font-plex text-[11px] sm:text-[12px] text-mix-muted tracking-[0.15em] uppercase">
        Ready when you are
      </div>
      <h2
        className="font-newsreader text-mix-ink m-0 mt-4 tracking-[-0.025em] font-normal leading-[1.05]"
        style={{ fontSize: 'clamp(24px, 4vw, 52px)' }}
      >
        Get started with a compliant<br />
        <span className="text-mix-stamp">Central London business address</span><br />
        today.
      </h2>
      <p
        className="font-newsreader text-mix-ink2 mt-5 leading-[1.5]"
        style={{ fontSize: 'clamp(14px, 1.4vw, 16px)' }}
      >
        £9.99/month. Cancel anytime. No tiers.
      </p>
      <button
        onClick={() => onNavigate?.('signup', { initialBilling: 'monthly' })}
        className="inline-flex items-center gap-2.5 bg-mix-green text-mix-paper-light px-7 py-4 sm:px-9 sm:py-5 rounded font-dmsans font-medium text-[14px] sm:text-[15px] mt-8 hover:bg-mix-green-deep transition-colors"
      >
        Claim your address
        <span className="font-newsreader">→</span>
      </button>
    </section>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main
      id="main-content"
      role="main"
      className="bg-mix-paper text-mix-ink font-dmsans"
    >
      <MixHero onNavigate={onNavigate} />
      <MixUseFor />
      <MixHow />
      <MixPlan onNavigate={onNavigate} />
      <MixForWhom />
      <MixFAQ />
      <MixCTA onNavigate={onNavigate} />
    </main>
  );
}
