'use client';

import {
  Mail,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  Search,
  MessageCircle,
  Phone,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
    id: "vah-location",
    category: "Understanding Your Virtual Address",
    q: "Where is my Virtual Address located?",
    a: `Your Virtual Address is in Central London, providing your business with a prestigious location that enhances credibility with clients, suppliers, and official bodies like Companies House and HMRC.`,
  },
  {
    id: "vah-legitimate",
    category: "Understanding Your Virtual Address",
    q: "Is a Virtual Address legitimate for business use?",
    a: `Absolutely. Virtual Addresses are fully legitimate and widely used by businesses worldwide. They're accepted by Companies House, HMRC, banks, and other official institutions as valid business addresses.`,
  },

  // Mail Handling & Management
  {
    id: "mail-scanning",
    category: "Mail Handling & Management",
    q: "How quickly do you scan and upload my mail?",
    a: `We scan and upload your mail on the same business day it arrives, usually within 2-4 hours during business hours. You'll receive an email notification as soon as it's available in your dashboard.`,
  },
  {
    id: "mail-forwarding",
    category: "Mail Handling & Management",
    q: "Can you forward my mail to me?",
    a: `Yes! We offer mail forwarding services. HMRC and Companies House mail can be forwarded free of charge to any UK address. Other mail can be forwarded for a small fee plus postage costs.`,
  },
  {
    id: "mail-security",
    category: "Mail Handling & Management",
    q: "How secure is my mail handling?",
    a: `Your mail is handled with the highest security standards. We're GDPR compliant, ICO registered, and all mail is processed in secure facilities with strict access controls.`,
  },

  // Pricing & Billing
  {
    id: "pricing-transparent",
    category: "Pricing & Billing",
    q: "Are there any hidden fees?",
    a: `No hidden fees whatsoever. Our pricing is completely transparent. You pay £9.99 per month for the core service, and any additional services (like mail forwarding) are clearly priced and optional.`,
  },
  {
    id: "billing-flexible",
    category: "Pricing & Billing",
    q: "Can I cancel anytime?",
    a: `Yes, you can cancel your subscription at any time with no penalties or cancellation fees. We believe in earning your business every month.`,
  },
  {
    id: "payment-methods",
    category: "Pricing & Billing",
    q: "What payment methods do you accept?",
    a: `We accept all major credit cards, debit cards, and bank transfers. All payments are processed securely through our payment partners.`,
  },

  // Compliance & Security
  {
    id: "compliance-standards",
    category: "Compliance & Security",
    q: "What compliance standards do you meet?",
    a: `We're fully compliant with UK regulations including GDPR, ICO registered, and HMRC AML supervised. We meet all requirements for virtual office providers in the UK.`,
  },
  {
    id: "data-protection",
    category: "Compliance & Security",
    q: "How do you protect my data?",
    a: `We use enterprise-grade security measures including encryption, secure servers, and strict access controls. All data is stored in compliance with GDPR requirements.`,
  },
  {
    id: "privacy-policy",
    category: "Compliance & Security",
    q: "Is my personal information kept private?",
    a: `Absolutely. We never share your personal information with third parties without your consent. Your privacy is protected by our strict privacy policy and GDPR compliance.`,
  },

  // Who We Support
  {
    id: "business-types",
    category: "Who We Support",
    q: "What types of businesses can use your service?",
    a: `We support all types of businesses including limited companies, LLPs, sole traders, and international businesses looking to establish a UK presence.`,
  },
  {
    id: "international-clients",
    category: "Who We Support",
    q: "Do you support international clients?",
    a: `Yes! We have clients from over 50 countries worldwide. Our service is designed to help international businesses establish a professional UK presence.`,
  },
  {
    id: "startup-support",
    category: "Who We Support",
    q: "Is this suitable for startups?",
    a: `Perfect for startups! Our service provides the professional address and mail handling you need without the overhead of a physical office, helping you focus on growing your business.`,
  },

  // Getting Started
  {
    id: "signup-process",
    category: "Getting Started",
    q: "How do I get started?",
    a: `Simply sign up for an account, complete our verification process (KYC/AML), and once approved, you'll receive your London business address and access to your dashboard.`,
  },
  {
    id: "verification-time",
    category: "Getting Started",
    q: "How long does verification take?",
    a: `Verification typically takes 1-2 business days. We'll notify you as soon as your account is approved and your address is ready to use.`,
  },
  {
    id: "immediate-use",
    category: "Getting Started",
    q: "When can I start using my address?",
    a: `Once your account is verified and approved, you can immediately start using your London address for business registration, banking, and all official correspondence.`,
  },
];

interface HelpPageProps {
  onNavigate?: (page: string, data?: any) => void;
  onGoBack?: () => void;
}

export function HelpPage({ onNavigate, onGoBack }: HelpPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'All'>('All');

  // Filter FAQs based on search term and category
  const filteredFAQs = useMemo(() => {
    let filtered = FAQS;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(faq => 
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [searchTerm, selectedCategory]);

  // Group FAQs by category
  const groupedFAQs = useMemo(() => {
    const groups: Record<CategoryName, FAQ[]> = {
      "Understanding Your Virtual Address": [],
      "Mail Handling & Management": [],
      "Pricing & Billing": [],
      "Compliance & Security": [],
      "Who We Support": [],
      "Getting Started": [],
    };
    
    filteredFAQs.forEach(faq => {
      groups[faq.category].push(faq);
    });
    
    return groups;
  }, [filteredFAQs]);

  // Generate structured data for SEO
  const faqStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }), []);

  const categories: (CategoryName | 'All')[] = [
    'All',
    'Understanding Your Virtual Address',
    'Mail Handling & Management',
    'Pricing & Billing',
    'Compliance & Security',
    'Who We Support',
    'Getting Started'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container-modern py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGoBack}
                  className="btn-outline"
                >
                  ← Back
                </Button>
              )}
              <h1 className="text-2xl font-bold">Help Center</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-background to-muted/30">
        <div className="container-modern">
          <div className="text-center mb-16">
            <h2 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
              How Can We <span className="text-gradient">Help You?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance mb-8">
              Find answers to common questions about our virtual address services, or get in touch with our support team.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 form-input"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "btn-primary" : "btn-outline"}
                >
                  {category === 'All' ? 'All Topics' : category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="section-padding">
        <div className="container-modern">
          <div className="grid gap-6 md:grid-cols-4 mb-16">
            <Card className="card-modern p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-xl mx-auto mb-4 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">ICO Registered</h3>
              <p className="text-sm text-muted-foreground">Fully compliant with UK data protection laws</p>
            </Card>

            <Card className="card-modern p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/90 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Same-Day Service</h3>
              <p className="text-sm text-muted-foreground">Mail scanned and uploaded within hours</p>
            </Card>

            <Card className="card-modern p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Transparent Pricing</h3>
              <p className="text-sm text-muted-foreground">No hidden fees, cancel anytime</p>
            </Card>

            <Card className="card-modern p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Expert Support</h3>
              <p className="text-sm text-muted-foreground">UK-based team available Mon-Fri</p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="section-padding bg-gradient-to-b from-muted/30 to-background">
        <div className="container-modern">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or browse all topics.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="btn-outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedFAQs).map(([category, faqs]) => {
                if (faqs.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h3 className="text-2xl font-bold mb-6 text-center">
                      <span className="text-gradient">{category}</span>
                    </h3>
                    
                    <Accordion type="single" collapsible className="max-w-4xl mx-auto">
                      {faqs.map((faq) => (
                        <AccordionItem key={faq.id} value={faq.id} className="border-border">
                          <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="section-padding">
        <div className="container-modern">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">
              Still Need <span className="text-gradient">Help?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance mb-8">
              Our support team is here to help you with any questions or concerns.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <Card className="card-modern p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Live Chat</h3>
              <p className="text-muted-foreground mb-6">
                Get instant help from our support team during business hours.
              </p>
              <Button
                onClick={() => onNavigate?.('contact')}
                className="btn-primary"
              >
                Start Chat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>

            <Card className="card-modern p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Email Support</h3>
              <p className="text-muted-foreground mb-6">
                Send us a detailed message and we'll respond within 24 hours.
              </p>
              <Button
                onClick={() => onNavigate?.('contact')}
                className="btn-outline"
              >
                Send Email
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>

            <Card className="card-modern p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Phone Support</h3>
              <p className="text-muted-foreground mb-6">
                Speak directly with our team Monday to Friday, 9AM-6PM GMT.
              </p>
              <Button
                onClick={() => onNavigate?.('contact')}
                className="btn-outline"
              >
                Call Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="card-modern p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Support Hours</h3>
              </div>
              <p className="text-muted-foreground">
                Monday to Friday: 9:00 AM - 6:00 PM GMT<br />
                Weekend: Emergency support only
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
    </div>
  );
}