'use client';

import { useMemo, ReactNode, useState, useEffect, useRef } from "react";

type CategoryName =
  | "Understanding Your Virtual Address"
  | "Mail Handling & Management"
  | "Pricing & Billing"
  | "Managing your account"
  | "Mail & troubleshooting"
  | "International customers"
  | "Compliance & Security"
  | "Who We Support"
  | "Getting Started";

type FAQ = {
  id: string;
  category: CategoryName;
  q: string;
  a: string | ReactNode;
};

const FAQS: FAQ[] = [
  // Understanding Your Virtual Address
  {
    id: "vah-what",
    category: "Understanding Your Virtual Address",
    q: "What exactly is a Virtual Address with VirtualAddressHub?",
    a: `It's a real, physical UK office address for your business, without the traditional costs and commitment of renting an office. We handle your official mail by scanning and uploading it securely to your online dashboard—usually the same working day—all for £9.99 per month.`,
  },
  {
    id: "vah-registered-office",
    category: "Understanding Your Virtual Address",
    q: "Can I use your address as my official Registered Office & Director's Service Address?",
    a: `Absolutely. Our address is fully compliant for both your Registered Office and Director's Service Address with Companies House and HMRC. It meets the "appropriate address" requirements under the 2023 Economic Crime and Corporate Transparency Act.`,
  },
  {
    id: "vah-usage",
    category: "Understanding Your Virtual Address",
    q: "What can I use the address for in my day-to-day business?",
    a: `Use it for most professional correspondence: your website, invoices, contracts, and to open a UK business bank account.\n\nPlease note: The address cannot be used for personal post, residential use, retail goods returns, parcels, or DVLA documents. Unaccepted items will be refused or returned to sender.`,
  },
  {
    id: "vah-real-office",
    category: "Understanding Your Virtual Address",
    q: "Is this a real, staffed office?",
    a: `Yes — it's a genuine physical location in Central London with staff present, as required by UK law. While it's not a public-facing office, limited in-person collection may be arranged in advance where appropriate.`,
  },
  {
    id: "vah-royal-mail-redirect",
    category: "Understanding Your Virtual Address",
    q: "Can I just use Royal Mail to redirect my post to you?",
    a: `No. Royal Mail does not permit redirection to virtual office providers. Please give your new VirtualAddressHub address directly to clients, suppliers, and your bank.`,
  },
  {
    id: "vah-registered-vs-trading",
    category: "Understanding Your Virtual Address",
    q: "What's the difference between a Registered Office and a Trading Address?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          A <strong>Registered Office</strong> is your company's official legal address on Companies House. Government bodies like Companies House and HMRC send official notices there.
        </p>
        <p>
          A <strong>Trading Address</strong> (or business correspondence address) is where everyday business mail is sent – things like client letters, invoices, contracts, and suppliers.
        </p>
        <p>With VirtualAddressHub, you can use our address as:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Your <strong>Registered Office</strong> and <strong>Director's Service Address</strong> on Companies House</li>
          <li>Your <strong>business correspondence address</strong> for clients and other professional contacts</li>
        </ul>
      </div>
    ),
  },
  {
    id: "vah-stop-paying",
    category: "Understanding Your Virtual Address",
    q: "What happens to my mail if I stop paying?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>If you cancel your plan or your payments stop:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>We stop accepting <strong>new</strong> mail to your VirtualAddressHub address.</li>
          <li>Existing scanned items remain in your dashboard for a limited time so you can download anything important.</li>
          <li>After our retention period, any remaining physical mail is securely destroyed in line with our Mail Handling Policy.</li>
        </ul>
        <p>If you think you might need the address again in future, contact support before cancelling so we can explain your options.</p>
      </div>
    ),
  },

  // Mail Handling & Management
  {
    id: "mail-scan",
    category: "Mail Handling & Management",
    q: "How does mail scanning work?",
    a: `When a letter arrives, we scan and upload it securely to your dashboard—usually the same business day—and email you an alert. From your dashboard, you can view, download, and request forwarding.`,
  },
  {
    id: "mail-forwarding",
    category: "Mail Handling & Management",
    q: "Do you forward physical letters too?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>Yes—on request from your dashboard:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>HMRC & Companies House letters: forwarded free within the UK.</li>
          <li>Other UK letters: £2 per item (covers postage & handling).</li>
          <li>International forwarding: Royal Mail rate + £3 handling fee.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "mail-retention",
    category: "Mail Handling & Management",
    q: "How long do you keep my mail?",
    a: `Physical letters are stored securely for 30 days to allow forwarding requests, then securely shredded.`,
  },

  // Pricing & Billing
  {
    id: "billing-price",
    category: "Pricing & Billing",
    q: "What is the total price? Are there any hidden fees?",
    a: `The plan is £9.99 per month. This includes your UK business address, unlimited mail scanning, dashboard access, and support. No setup fees or hidden charges. Only optional forwarding of non-official mail is chargeable as outlined.`,
  },
  {
    id: "billing-start",
    category: "Pricing & Billing",
    q: "When does my subscription start and billing begin?",
    a: `Your subscription starts at sign-up once your payment is confirmed. Billing is monthly via Stripe.`,
  },
  {
    id: "billing-cancel",
    category: "Pricing & Billing",
    q: "How easy is it to cancel?",
    a: `Very easy. You can cancel anytime from your dashboard or by emailing support.`,
  },

  // Managing your account
  {
    id: "account-payment-method",
    category: "Managing your account",
    q: "How do I update my payment method?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          You can update your payment details any time from your dashboard under <strong>Settings → Billing</strong>.
        </p>
        <p>
          Click <strong>Update payment method</strong> and you'll be taken to a secure Stripe page to update your card or bank details. Once confirmed, future payments will use the new method automatically.
        </p>
      </div>
    ),
  },
  {
    id: "account-invoices",
    category: "Managing your account",
    q: "Where can I download my invoices?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>We generate an invoice for each successful payment.</p>
        <p>
          You can view and download your invoices from <strong>Dashboard → Billing & Invoices</strong>. We also email you a copy of each invoice to the email address on your account.
        </p>
      </div>
    ),
  },
  {
    id: "account-password-reset",
    category: "Managing your account",
    q: "I forgot my password – how do I reset it?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          On the login page, click <strong>Forgot your password?</strong> and enter the email address linked to your account.
        </p>
        <p>
          We'll send you a secure password reset link. For security reasons, the link expires after 30 minutes – if it expires, just request a new one.
        </p>
      </div>
    ),
  },
  {
    id: "account-cancel-subscription",
    category: "Managing your account",
    q: "How do I cancel my subscription?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          To cancel your subscription, go to <strong>Dashboard → Billing → Cancel subscription</strong>.
          We'll stop future billing and your address will remain active until the end of your current paid period.
        </p>
        <p>
          If you have any issues cancelling, just email <strong>support@virtualaddresshub.co.uk</strong> and we'll help.
        </p>
      </div>
    ),
  },

  // Mail & troubleshooting
  {
    id: "troubleshooting-mail-delay",
    category: "Mail & troubleshooting",
    q: "My mail hasn't appeared in my dashboard yet – what should I do?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          Most mail is scanned and uploaded to your dashboard within <strong>one working day</strong> of arriving at our office.
        </p>
        <p>
          If it has been more than <strong>two working days</strong> (Monday to Friday, excluding bank holidays) and you're expecting something important, please contact support with:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Your name</li>
          <li>Your company name (if applicable)</li>
          <li>The sender's name (if known)</li>
        </ul>
        <p>We'll check our internal logs and storage to locate it for you.</p>
      </div>
    ),
  },
  {
    id: "troubleshooting-id-rejected",
    category: "Mail & troubleshooting",
    q: "Why was my ID rejected during verification?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>There are a few common reasons identity checks fail:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>The document is blurry, cropped, or partially hidden</li>
          <li>The details on the document don't match the details on your account</li>
          <li>The document is expired or not fully visible</li>
          <li>The proof of address is not in your name or not accepted by our provider</li>
        </ul>
        <p>
          In most cases you can simply try again with a clearer or different document from the same country. If you're unsure what went wrong, contact support and we'll explain what needs to be updated.
        </p>
      </div>
    ),
  },

  // International customers
  {
    id: "international-non-uk-resident",
    category: "International customers",
    q: "Do I need to live in the UK to use VirtualAddressHub?",
    a: `No. International founders are welcome.\n\nYou don't need to live in the UK to use our address. All we require is that you successfully complete identity verification under UK AML (anti-money laundering) regulations.`,
  },
  {
    id: "international-visa-residency",
    category: "International customers",
    q: "Do I need a UK visa or residency to use a virtual address?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>
          No. You do <strong>not</strong> need a UK visa or UK residency status to hold a virtual business address with us.
        </p>
        <p>
          However, you are responsible for making sure you meet any legal or tax requirements in your home country and in the UK.
        </p>
      </div>
    ),
  },
  {
    id: "international-company-formation",
    category: "International customers",
    q: "Can you help me set up a UK company?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>We don't currently offer a full company formation service.</p>
        <p>
          You can register a company directly with Companies House yourself, and then use VirtualAddressHub as your <strong>Registered Office</strong> and <strong>Director's Service Address</strong> once your account with us is approved.
        </p>
      </div>
    ),
  },

  // Compliance & Security
  {
    id: "compliance-aml",
    category: "Compliance & Security",
    q: "Are you registered with HMRC for anti-money laundering (AML) compliance?",
    a: `Yes. VirtualAddressHub is fully compliant with UK AML regulations and registered with HMRC as a Trust or Company Service Provider (TCSP).`,
  },
  {
    id: "compliance-kyc",
    category: "Compliance & Security",
    q: "What ID will I need to provide during sign-up?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p>For UK KYC compliance, you'll need:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>A valid photo ID (passport, driving licence, or national ID)</li>
          <li>Proof of residential address (issued within the last 3 months)</li>
          <li>A selfie to verify your identity</li>
        </ul>
        <p>Verification is completed securely online.</p>
      </div>
    ),
  },
  {
    id: "compliance-gdpr",
    category: "Compliance & Security",
    q: "How do you protect my data and mail?",
    a: `We comply fully with UK GDPR. Physical letters are securely stored for 30 days to allow forwarding requests, after which they are shredded.`,
  },
  {
    id: "compliance-misuse",
    category: "Compliance & Security",
    q: "What happens if someone misuses the address?",
    a: `We act immediately. Accounts used for illegal, fraudulent, or unauthorised activity are suspended or terminated. This includes fraud, impersonation, or sending personal post.`,
  },

  // Who We Support
  {
    id: "support-nonuk",
    category: "Who We Support",
    q: "Can non-UK residents sign up?",
    a: `Yes—entrepreneurs from around the world are welcome to establish a legitimate, compliant UK presence.`,
  },
  {
    id: "support-banking",
    category: "Who We Support",
    q: "Can I use this address to open a UK business bank account?",
    a: `In most cases, yes. Our address meets registration and compliance standards. Banks may have their own policies—please check with your chosen bank.`,
  },
  {
    id: "support-restrictions",
    category: "Who We Support",
    q: "Are there any business types you don't support?",
    a: `We cannot support businesses involved in: cryptocurrencies or gambling, weapons or tobacco products, adult content, unregulated financial services, religious or political organisations, or multi-level marketing (MLM). If unsure, please contact us.`,
  },

  // Getting Started
  {
    id: "start-signup",
    category: "Getting Started",
    q: "How do I sign up?",
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>
          Head to the{' '}
          <a
            href="/pricing"
            style={{ color: '#0A0A0A', textDecoration: 'underline', fontWeight: 500 }}
          >
            Pricing page
          </a>
          {' '}and click <strong>Create Account</strong>. Follow the steps to complete KYC verification. Once approved, your official Central London address will appear in your dashboard and be ready to use.
        </p>
        <p>
          <a
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#0A0A0A',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'background 0.15s',
            }}
          >
            Get started →
          </a>
        </p>
      </div>
    ),
  },
];

const SIDEBAR_CATEGORIES: CategoryName[] = [
  "Understanding Your Virtual Address",
  "Mail Handling & Management",
  "Pricing & Billing",
  "Managing your account",
  "Mail & troubleshooting",
  "International customers",
  "Compliance & Security",
  "Who We Support",
  "Getting Started",
];

interface HelpPageProps {
  onNavigate?: (page: string) => void;
  onGoBack?: () => void;
}

export function HelpPage({ onNavigate, onGoBack }: HelpPageProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryName>("Understanding Your Virtual Address");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<CategoryName, FAQ[]>();
    FAQS.forEach((f) => {
      const arr = map.get(f.category) || [];
      arr.push(f);
      map.set(f.category, arr);
    });
    return SIDEBAR_CATEGORIES
      .filter((k) => map.has(k))
      .map((k) => ({ category: k, items: map.get(k)! }));
  }, []);

  const activeFAQs = useMemo(() => {
    return grouped.find(g => g.category === activeCategory)?.items || [];
  }, [grouped, activeCategory]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Close all items when category changes
  useEffect(() => {
    setOpenItems(new Set());
  }, [activeCategory]);

  // JSON-LD for FAQ rich results
  const faqJsonLd = useMemo(() => {
    const list = FAQS.map((f) => {
      let answerText = '';
      if (typeof f.a === 'string') {
        answerText = f.a;
      } else {
        const jsxTextMap: Record<string, string> = {
          'vah-registered-vs-trading': `A Registered Office is your company's official legal address on Companies House. A Trading Address is where everyday business mail is sent. With VirtualAddressHub, you can use our address as your Registered Office, Director's Service Address, and business correspondence address.`,
          'vah-stop-paying': `If you cancel, we stop accepting new mail. Existing scanned items remain available for download for a limited time before secure destruction.`,
          'mail-forwarding': `Yes—on request: HMRC & Companies House letters forwarded free within the UK. Other UK letters: £2 per item. International: Royal Mail rate + £3 handling.`,
          'account-payment-method': `Update payment details any time from Dashboard → Settings → Billing via a secure Stripe page.`,
          'account-invoices': `View and download invoices from Dashboard → Billing & Invoices. Copies are also emailed to you.`,
          'account-password-reset': `Click Forgot your password? on the login page. A secure reset link valid for 30 minutes will be sent to your email.`,
          'account-cancel-subscription': `Go to Dashboard → Billing → Cancel subscription. Your address remains active until the end of the paid period.`,
          'troubleshooting-mail-delay': `Most mail is uploaded within one working day. If delayed beyond two working days, contact support with your name, company name, and sender's name.`,
          'troubleshooting-id-rejected': `Common reasons: blurry/cropped document, details mismatch, expired document, or unaccepted proof of address. Try again with a clearer document.`,
          'international-visa-residency': `No UK visa or residency needed. You are responsible for legal/tax requirements in your home country and the UK.`,
          'international-company-formation': `We don't offer company formation. Register directly with Companies House, then use VirtualAddressHub as your Registered Office.`,
          'compliance-kyc': `You'll need: valid photo ID, proof of residential address (last 3 months), and a selfie. Verification is completed online.`,
        };
        answerText = jsxTextMap[f.id] || 'Please see the full answer in the FAQ section.';
      }
      return {
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: answerText },
      };
    });
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: list,
    };
  }, []);

  // Number items within the active category
  const getItemNumber = (index: number) => String(index + 1).padStart(2, '0');

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      <style>{`
        .help-sidebar-btn {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px 16px 10px 20px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          color: #6B6B6B;
          border-left: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          line-height: 1.4;
        }
        .help-sidebar-btn:hover {
          color: #0A0A0A;
        }
        .help-sidebar-btn.active {
          color: #0A0A0A;
          font-style: normal;
          border-left-color: #0A0A0A;
        }
        .help-faq-row {
          border-bottom: 1px solid #E5E5E5;
        }
        .help-faq-row:first-child {
          border-top: 1px solid #E5E5E5;
        }
        .help-faq-trigger {
          display: flex;
          align-items: baseline;
          gap: 16px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          padding: 20px 0;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .help-faq-trigger:hover .help-faq-question {
          color: #0A0A0A;
        }
        .help-faq-num {
          font-family: 'IBM Plex Mono', 'Courier New', monospace;
          font-size: 12px;
          color: #6B6B6B;
          flex-shrink: 0;
          margin-top: 2px;
          letter-spacing: 0.02em;
        }
        .help-faq-question {
          flex: 1;
          font-size: 15px;
          font-weight: 500;
          color: #0A0A0A;
          line-height: 1.45;
          transition: color 0.15s;
        }
        .help-faq-plus {
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-style: normal;
          color: #0A0A0A;
          font-weight: 400;
          margin-left: 12px;
          transition: transform 0.2s ease;
          display: inline-block;
          line-height: 1;
        }
        .help-faq-plus.open {
          transform: rotate(45deg);
        }
        .help-faq-answer {
          padding: 0 0 20px 38px;
          font-size: 14px;
          color: #404040;
          line-height: 1.7;
        }
        .help-faq-answer p { margin: 0 0 10px; }
        .help-faq-answer p:last-child { margin-bottom: 0; }
        .help-faq-answer ul { margin: 8px 0; padding-left: 18px; }
        .help-faq-answer li { margin-bottom: 4px; }
        .help-cta-card {
          background: #0A0A0A;
          border-radius: 8px;
          padding: 36px 40px;
          margin-top: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .help-cta-btn {
          background: #FFFFFF;
          color: #0A0A0A;
          border: none;
          border-radius: 4px;
          padding: 12px 24px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          flex-shrink: 0;
        }
        .help-cta-btn:hover { background: #FFFFFF; }
        .help-cta-btn:active { transform: scale(0.97); background: #F5F5F5; }
        @media (max-width: 768px) {
          .help-layout { flex-direction: column !important; }
          .help-sidebar { position: static !important; width: 100% !important; }
          .help-sidebar-inner { display: flex; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; gap: 4px; }
          .help-sidebar-btn {
            white-space: nowrap;
            border-left: none !important;
            border-bottom: 2px solid transparent;
            padding: 8px 12px !important;
            font-size: 12.5px;
          }
          .help-sidebar-btn.active {
            border-bottom-color: #0A0A0A !important;
            border-left-color: transparent !important;
          }
          .help-faq-answer { padding-left: 28px; }
          .help-cta-card { padding: 28px 24px; }
        }
      `}</style>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,60px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'clamp(40px,6vw,64px)' }}>
          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(32px,5vw,54px)',
            fontWeight: 600,
            color: '#0A0A0A',
            lineHeight: 1.15,
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
          }}>
            Got questions?{' '}
            <em style={{ color: '#6B6B6B', fontStyle: 'normal' }}>We've got answers.</em>
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(14px,2vw,17px)',
            color: '#6B6B6B',
            margin: 0,
            maxWidth: '560px',
            lineHeight: 1.6,
          }}>
            Everything we get asked about, in plain English. If your question isn't here,{' '}
            <button
              onClick={() => onNavigate?.('contact')}
              style={{ background: 'none', border: 'none', color: '#0A0A0A', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}
            >
              the contact page is.
            </button>
          </p>
        </div>

        {/* Two-column layout */}
        <div className="help-layout" style={{ display: 'flex', gap: 'clamp(32px,5vw,72px)', alignItems: 'flex-start' }}>

          {/* Sidebar */}
          <div
            className="help-sidebar"
            style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '96px' }}
          >
            <div className="help-sidebar-inner">
              {SIDEBAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`help-sidebar-btn${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(18px,2.5vw,24px)',
              fontWeight: 600,
              color: '#0A0A0A',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}>
              {activeCategory}
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#6B6B6B', margin: '0 0 28px' }}>
              {activeFAQs.length} {activeFAQs.length === 1 ? 'question' : 'questions'}
            </p>

            <div>
              {activeFAQs.map((f, index) => {
                const isOpen = openItems.has(f.id);
                return (
                  <div key={f.id} className="help-faq-row">
                    <button
                      className="help-faq-trigger"
                      onClick={() => toggleItem(f.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="help-faq-num">{getItemNumber(index)}</span>
                      <span className="help-faq-question">{f.q}</span>
                      <span className={`help-faq-plus${isOpen ? ' open' : ''}`}>+</span>
                    </button>
                    {isOpen && (
                      <div className="help-faq-answer">
                        {typeof f.a === 'string' ? (
                          <div style={{ whiteSpace: 'pre-line' }}>{f.a}</div>
                        ) : (
                          <div>{f.a}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Still stuck CTA */}
            <div className="help-cta-card">
              <div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(18px,2.5vw,22px)',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: '0 0 6px',
                }}>
                  Still stuck?
                </p>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  color: 'rgba(242,235,221,0.75)',
                  margin: 0,
                }}>
                  We're a small team — we actually reply.
                </p>
              </div>
              <button
                className="help-cta-btn"
                onClick={() => onNavigate?.('contact')}
              >
                Contact us →
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
