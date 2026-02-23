'use client';

import {
  Mail,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  Plus,
  Minus,
} from "lucide-react";

import { useMemo, ReactNode, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";

/**
 * Help (grouped by section headers)
 * - Trust highlights
 * - Section headers (categories), each with its own accordion
 * - JSON-LD for FAQ rich snippets
 * - Compact contact CTA
 */

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
    a: `Use it for most professional correspondence: your website, invoices, contracts, and to open a UK business bank account.

Please note: The address cannot be used for personal post, residential use, retail goods returns, parcels, or DVLA documents. Unaccepted items will be refused or returned to sender.`,
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
      <div className="space-y-3">
        <p>
          A <strong>Registered Office</strong> is your company's official legal address on Companies House. Government bodies like Companies House and HMRC send official notices there.
        </p>
        <p>
          A <strong>Trading Address</strong> (or business correspondence address) is where everyday business mail is sent – things like client letters, invoices, contracts, and suppliers.
        </p>
        <p>With VirtualAddressHub, you can use our address as:</p>
        <ul className="list-disc ml-6 space-y-1">
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
      <div className="space-y-3">
        <p>If you cancel your plan or your payments stop:</p>
        <ul className="list-disc ml-6 space-y-1">
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
      <div className="space-y-3">
        <p>Yes—on request from your dashboard:</p>
        <ul className="list-disc ml-6 space-y-1">
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
      <div className="space-y-3">
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
      <div className="space-y-3">
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
      <div className="space-y-3">
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
      <div className="space-y-3">
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
      <div className="space-y-3">
        <p>
          Most mail is scanned and uploaded to your dashboard within <strong>one working day</strong> of arriving at our office.
        </p>
        <p>
          If it has been more than <strong>two working days</strong> (Monday to Friday, excluding bank holidays) and you're expecting something important, please contact support with:
        </p>
        <ul className="list-disc ml-6 space-y-1">
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
      <div className="space-y-3">
        <p>There are a few common reasons identity checks fail:</p>
        <ul className="list-disc ml-6 space-y-1">
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
    a: `No. International founders are welcome.

You don't need to live in the UK to use our address. All we require is that you successfully complete identity verification under UK AML (anti-money laundering) regulations.`,
  },
  {
    id: "international-visa-residency",
    category: "International customers",
    q: "Do I need a UK visa or residency to use a virtual address?",
    a: (
      <div className="space-y-3">
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
      <div className="space-y-3">
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
      <div className="space-y-3">
        <p>For UK KYC compliance, you'll need:</p>
        <ul className="list-disc ml-6 space-y-1">
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
    a: `Go to the Pricing page and click Create Account. Follow the steps to complete KYC. Once approved, your official Central London address will appear in your dashboard and be ready to use.`,
  },
];

interface HelpPageProps {
  onNavigate?: (page: string) => void;
  onGoBack?: () => void;
}

export function HelpPage({ onNavigate, onGoBack }: HelpPageProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryName>("Understanding Your Virtual Address");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Group FAQs by category for rendering
  const grouped = useMemo(() => {
    const map = new Map<CategoryName, FAQ[]>();
    FAQS.forEach((f) => {
      const arr = map.get(f.category) || [];
      arr.push(f);
      map.set(f.category, arr);
    });
    // Keep a stable, sensible order matching Figma
    const order: CategoryName[] = [
      "Understanding Your Virtual Address",
      "Mail Handling & Management",
      "Pricing & Billing",
      "Compliance & Security",
      "Who We Support",
      "Getting Started",
    ];
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ category: k, items: map.get(k)! }));
  }, []);

  // Get categories for sidebar (matching Figma order)
  const sidebarCategories = useMemo(() => {
    return [
      "Understanding Your Virtual Address",
      "Mail Handling & Management",
      "Pricing & Billing",
      "Compliance & Security",
      "Who We Support",
      "Getting Started",
    ] as CategoryName[];
  }, []);

  // Get FAQs for active category
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

  // JSON-LD for FAQ rich results
  const faqJsonLd = useMemo(() => {
    const list = FAQS.map((f) => {
      // Extract text from JSX answers for JSON-LD
      let answerText = '';
      if (typeof f.a === 'string') {
        answerText = f.a;
      } else {
        // Extract text content from JSX answers for SEO
        const jsxTextMap: Record<string, string> = {
          'vah-registered-vs-trading': `A Registered Office is your company's official legal address on Companies House. Government bodies like Companies House and HMRC send official notices there. A Trading Address (or business correspondence address) is where everyday business mail is sent – things like client letters, invoices, contracts, and suppliers. With VirtualAddressHub, you can use our address as: Your Registered Office and Director's Service Address on Companies House, Your business correspondence address for clients and other professional contacts.`,
          'vah-stop-paying': `If you cancel your plan or your payments stop: We stop accepting new mail to your VirtualAddressHub address. Existing scanned items remain in your dashboard for a limited time so you can download anything important. After our retention period, any remaining physical mail is securely destroyed in line with our Mail Handling Policy. If you think you might need the address again in future, contact support before cancelling so we can explain your options.`,
          'mail-forwarding': `Yes—on request from your dashboard: HMRC & Companies House letters: forwarded free within the UK. Other UK letters: £2 per item (covers postage & handling). International forwarding: Royal Mail rate + £3 handling fee.`,
          'account-payment-method': `You can update your payment details any time from your dashboard under Settings → Billing. Click Update payment method and you'll be taken to a secure Stripe page to update your card or bank details. Once confirmed, future payments will use the new method automatically.`,
          'account-invoices': `We generate an invoice for each successful payment. You can view and download your invoices from Dashboard → Billing & Invoices. We also email you a copy of each invoice to the email address on your account.`,
          'account-password-reset': `On the login page, click Forgot your password? and enter the email address linked to your account. We'll send you a secure password reset link. For security reasons, the link expires after 30 minutes – if it expires, just request a new one.`,
          'account-cancel-subscription': `To cancel your subscription, go to Dashboard → Billing → Cancel subscription. We'll stop future billing and your address will remain active until the end of your current paid period. If you have any issues cancelling, just email support@virtualaddresshub.co.uk and we'll help.`,
          'troubleshooting-mail-delay': `Most mail is scanned and uploaded to your dashboard within one working day of arriving at our office. If it has been more than two working days (Monday to Friday, excluding bank holidays) and you're expecting something important, please contact support with: Your name, Your company name (if applicable), The sender's name (if known). We'll check our internal logs and storage to locate it for you.`,
          'troubleshooting-id-rejected': `There are a few common reasons identity checks fail: The document is blurry, cropped, or partially hidden. The details on the document don't match the details on your account. The document is expired or not fully visible. The proof of address is not in your name or not accepted by our provider. In most cases you can simply try again with a clearer or different document from the same country. If you're unsure what went wrong, contact support and we'll explain what needs to be updated.`,
          'international-visa-residency': `No. You do not need a UK visa or UK residency status to hold a virtual business address with us. However, you are responsible for making sure you meet any legal or tax requirements in your home country and in the UK.`,
          'international-company-formation': `We don't currently offer a full company formation service. You can register a company directly with Companies House yourself, and then use VirtualAddressHub as your Registered Office and Director's Service Address once your account with us is approved.`,
          'compliance-kyc': `For UK KYC compliance, you'll need: A valid photo ID (passport, driving licence, or national ID), Proof of residential address (issued within the last 3 months), A selfie to verify your identity. Verification is completed securely online.`,
        };
        answerText = jsxTextMap[f.id] || 'Please see the full answer in the FAQ section above.';
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

  return (
    <div className="w-full bg-white relative z-0">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        {/* Hero Section - Clean, spacious */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-semibold text-neutral-900 leading-tight tracking-tight">
            Got questions? We've got answers.
          </h1>
          <p className="mt-4 text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Establish your business presence with a prestigious London address. Powered by our professional office near Tower Bridge.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-start">
          {/* Left Sidebar - Category Navigation */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
              <nav className="space-y-1">
                {sidebarCategories.map((category) => {
                  const isActive = category === activeCategory;
                  return (
                      <button
                      key={category}
                        onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive 
                          ? 'bg-white text-neutral-900 shadow-sm' 
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                        }`}
                      >
                        {category}
                      </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right Column - FAQ Accordions */}
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
                  {activeCategory}
                </h2>
            <div className="space-y-3">
                  {activeFAQs.map((f) => {
                    const isOpen = openItems.has(f.id);
                    return (
                      <div
                        key={f.id}
                    className={`border border-neutral-200 rounded-lg overflow-hidden transition-colors ${
                      isOpen ? 'bg-neutral-50' : 'bg-white'
                        }`}
                      >
                        <button
                          onClick={() => toggleItem(f.id)}
                      className="w-full flex items-center justify-between p-4 lg:p-5 text-left group"
                        >
                      <span className="text-sm lg:text-base font-medium text-neutral-900 leading-snug flex-1 pr-4">
                            {f.q}
                          </span>
                      <div className="flex-shrink-0">
                            {isOpen ? (
                          <Minus className="w-5 h-5 text-neutral-600" strokeWidth={2} />
                            ) : (
                          <Plus className="w-5 h-5 text-neutral-600" strokeWidth={2} />
                            )}
                          </div>
                        </button>
                        {isOpen && (
                      <div className="px-4 lg:px-5 pb-4 lg:pb-5">
                        <div className="text-sm lg:text-base text-neutral-600 leading-relaxed">
                              {typeof f.a === 'string' ? (
                            <div className="whitespace-pre-line">{f.a}</div>
                              ) : (
                            <div>{f.a}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
