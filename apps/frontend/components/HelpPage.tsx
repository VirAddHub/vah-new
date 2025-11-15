'use client';

import {
  Mail,
  CreditCard,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

import { useMemo } from "react";
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
  | "Compliance & Security"
  | "Who We Support"
  | "Getting Started";

type FAQ = {
  id: string;
  category: CategoryName;
  q: string;
  a: string;
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
    a: `Yes—on request from your dashboard:
• HMRC & Companies House letters: forwarded free within the UK.
• Other UK letters: £2 per item (covers postage & handling).
• International forwarding: Royal Mail rate + £3 handling fee.`,
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
    a: `Your subscription starts at sign-up once your mandate is set. Billing is monthly via Direct Debit (GoCardless).`,
  },
  {
    id: "billing-cancel",
    category: "Pricing & Billing",
    q: "How easy is it to cancel?",
    a: `Very easy. You can cancel anytime from your dashboard or by emailing support. After cancellation, you retain dashboard access for 30 days before full closure.`,
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
    a: `For UK KYC compliance, you'll need:
• A valid photo ID (passport, driving licence, or national ID)
• Proof of residential address (issued within the last 3 months)
• A selfie to verify your identity

Verification is completed securely online.`,
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
  // Group FAQs by category for rendering
  const grouped = useMemo(() => {
    const map = new Map<CategoryName, FAQ[]>();
    FAQS.forEach((f) => {
      const arr = map.get(f.category) || [];
      arr.push(f);
      map.set(f.category, arr);
    });
    // Keep a stable, sensible order
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

  // JSON-LD for FAQ rich results
  const faqJsonLd = useMemo(() => {
    const list = FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: list,
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* JSON-LD for SEO */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-[#1e3a8a]">
            Help Centre & FAQs
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Fast answers. Friendly support. Everything you need to
            know about VirtualAddressHub — all in one place.
          </p>
        </section>

        {/* Trust Highlights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 text-center">
          <div className="space-y-2">
            <ShieldCheck className="mx-auto text-gray-600 w-6 h-6" />
            <p className="text-sm font-medium">
              HMRC AML supervised
            </p>
            <p className="text-xs text-muted-foreground">
              Meets UK TCSP / KYC obligations
            </p>
          </div>
          <div className="space-y-2">
            <Mail className="mx-auto text-gray-600 w-6 h-6" />
            <p className="text-sm font-medium">
              Unlimited mail scanning
            </p>
            <p className="text-xs text-muted-foreground">
              Same working day (Mon–Fri)
            </p>
          </div>
          <div className="space-y-2">
            <CreditCard className="mx-auto text-gray-600 w-6 h-6" />
            <p className="text-sm font-medium">
              £9.99 flat monthly plan
            </p>
            <p className="text-xs text-muted-foreground">
              Transparent forwarding
            </p>
          </div>
        </section>

        {/* Grouped FAQs */}
        <section className="space-y-10">
          {grouped.map(({ category, items }) => (
            <div key={category} className="space-y-4">
              <h2 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold tracking-tight text-gray-900">
                {category}
              </h2>
              <Accordion type="multiple" className="space-y-2">
                {items.map((f) => (
                  <AccordionItem
                    key={f.id}
                    value={f.id}
                    className="border border-border rounded-xl bg-card"
                  >
                    <AccordionTrigger className="text-left px-4">
                      <span className="leading-tight">{f.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 whitespace-pre-line text-sm text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {/* No results fallback (should never hit) */}
          {grouped.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="w-6 h-6 mx-auto mb-2" />
              Nothing here yet. Check back soon.
            </div>
          )}
        </section>

        {/* Contact CTA */}
        <section className="text-center space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Still need help?
          </h3>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Message us via WhatsApp or email. We reply promptly
            during UK working hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="default"
              onClick={() => onNavigate?.("contact")}
            >
              Contact Support
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
