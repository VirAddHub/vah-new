'use client';

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSchemaProps {
    faqs: FAQItem[];
    className?: string;
}

export function FAQSchema({ faqs, className = "" }: FAQSchemaProps) {
    if (!faqs || faqs.length === 0) {
        return null;
    }

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <>
            {/* FAQ Schema for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema)
                }}
            />

            {/* Visual FAQ Section */}
            <div className={`bg-muted/30 rounded-lg p-8 ${className}`}>
                <h2 className="text-2xl font-semibold mb-6 text-foreground">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border-b border-border pb-4 last:border-b-0">
                            <h3 className="font-semibold text-lg text-foreground mb-2">
                                {faq.question}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// Predefined FAQ sets for common blog topics
export const FAQ_SETS = {
    'virtual-address': [
        {
            question: "What is a virtual business address?",
            answer: "A virtual business address is a professional address that businesses can use for official correspondence, company registration, and mail handling without needing a physical office space at that location."
        },
        {
            question: "Is a virtual address legal for company registration?",
            answer: "Yes, virtual addresses are completely legal for UK company registration. They must be real addresses where mail can be received and processed, which is exactly what VirtualAddressHub provides."
        },
        {
            question: "How does mail forwarding work?",
            answer: "When mail arrives at your virtual address, we scan it digitally and forward it to your preferred address. You can choose to have physical mail forwarded or just receive digital copies."
        }
    ],
    'company-formation': [
        {
            question: "What documents do I need to form a UK company?",
            answer: "You'll need proof of identity, proof of address, and details about your company structure. VirtualAddressHub can provide the registered office address required for incorporation."
        },
        {
            question: "How long does company formation take?",
            answer: "UK company formation typically takes 24-48 hours when using Companies House's online service. Having a virtual address ready can speed up the process."
        },
        {
            question: "Can I use a virtual address for HMRC correspondence?",
            answer: "Yes, virtual addresses are accepted by HMRC for tax correspondence. We ensure all official mail is handled professionally and forwarded promptly."
        }
    ],
    'mail-forwarding': [
        {
            question: "How quickly is mail processed?",
            answer: "Mail is typically processed within 24 hours of receipt. Urgent items can be expedited for an additional fee."
        },
        {
            question: "Can I choose which mail to forward?",
            answer: "Yes, you can set preferences for different types of mail. We can forward everything, filter out junk mail, or only forward specific types of correspondence."
        },
        {
            question: "Is my mail secure?",
            answer: "Absolutely. All mail is handled in secure facilities with strict confidentiality protocols. We never open or read your mail unless specifically requested."
        }
    ]
};

// Helper function to get FAQ set by topic
export function getFAQSet(topic: string): FAQItem[] {
    return FAQ_SETS[topic as keyof typeof FAQ_SETS] || [];
}
