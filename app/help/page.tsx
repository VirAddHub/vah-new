'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import HelpKeyBenefit from './Benefit';

const faqs = [
    {
        question: "How does the virtual address service work?",
        answer: "We provide you with a professional UK business address that you can use for company registration and correspondence. When mail arrives, we scan it and send you digital copies via email. You can then view, download, and forward your mail through our secure dashboard."
    },
    {
        question: "Is my mail handled securely?",
        answer: "Yes, absolutely. All mail is handled with strict confidentiality and GDPR compliance. We use secure scanning and storage systems, and all mail is disposed of securely after the required retention period."
    },
    {
        question: "How long do you hold my mail?",
        answer: "We hold physical mail for 14 days after scanning. During this time, you can request forwarding or collection. After 14 days, mail is securely disposed of unless you have a forwarding arrangement."
    },
    {
        question: "Can I use this address for company registration?",
        answer: "Yes, our addresses are suitable for Companies House registration and can be used as your registered office address and director's service address."
    },
    {
        question: "What types of mail can you handle?",
        answer: "We can handle most types of business mail including letters, packages, and official correspondence. We cannot handle perishable items, hazardous materials, or items requiring refrigeration."
    },
    {
        question: "How do I get proof of address?",
        answer: "Once your identity is verified (KYC approved), you can download a Proof of Address Certificate from your dashboard. This certificate is generated fresh with today's date and includes your business details."
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept payments through GoCardless for direct debit, as well as credit and debit cards. All payments are processed securely and you'll receive invoices for your records."
    },
    {
        question: "Can I change my plan?",
        answer: "Yes, you can upgrade or downgrade your plan at any time through your dashboard. Changes take effect at your next billing cycle."
    },
    {
        question: "What if I need to speak to someone?",
        answer: "Our support team is available Monday-Friday, 9AM-6PM GMT. You can contact us via the support form, email, or phone. We also have a comprehensive FAQ and help center."
    },
    {
        question: "Is there a minimum contract period?",
        answer: "No, there are no minimum contract periods. You can cancel your service at any time with 30 days notice. We believe in providing flexible solutions for your business needs."
    },
    {
        question: "Do you charge to forward HMRC or Companies House letters?",
        answer: "No, we forward letters from HMRC and Companies House free of charge. This applies to letters only - parcels and magazines are not included in this offer."
    }
];

export default function HelpPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredFaqs = useMemo(() => {
        return faqs.filter(faq =>
            faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const categories = [
        { id: 'all', name: 'All Topics' },
        { id: 'service', name: 'Service' },
        { id: 'billing', name: 'Billing' },
        { id: 'security', name: 'Security' },
        { id: 'technical', name: 'Technical' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Help Center
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Find answers to common questions and get the support you need.
                    </p>
                    <HelpKeyBenefit />
                </div>

                {/* Search */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for help..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Link href="/dashboard" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">📊</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Dashboard</h3>
                        <p className="text-sm text-gray-600">Manage your mail and account</p>
                    </Link>

                    <Link href="/billing" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">💳</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Billing</h3>
                        <p className="text-sm text-gray-600">View invoices and payments</p>
                    </Link>

                    <Link href="/kyc" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">🆔</div>
                        <h3 className="font-semibold text-gray-900 mb-2">KYC</h3>
                        <p className="text-sm text-gray-600">Identity verification</p>
                    </Link>

                    <Link href="/restart" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">🔄</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Restart</h3>
                        <p className="text-sm text-gray-600">Reactivate your account</p>
                    </Link>

                    <Link href="/profile" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">👤</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Profile</h3>
                        <p className="text-sm text-gray-600">Account settings</p>
                    </Link>

                    <Link href="/privacy" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-green-600 text-2xl mb-3">🔒</div>
                        <h3 className="font-semibold text-gray-900 mb-2">Privacy</h3>
                        <p className="text-sm text-gray-600">Privacy policy</p>
                    </Link>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-lg shadow-md p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

                    <div className="space-y-4">
                        {filteredFaqs.map((faq, index) => (
                            <div key={index} className="border-b border-gray-200 pb-4">
                                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                                <p className="text-gray-600">{faq.answer}</p>
                            </div>
                        ))}
                    </div>

                    {filteredFaqs.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No results found for "{searchTerm}"</p>
                            <p className="text-sm text-gray-400 mt-2">Try different keywords or browse all topics</p>
                        </div>
                    )}
                </div>

                {/* Contact Support */}
                <div className="mt-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Still need help?</h2>
                    <p className="text-gray-600 mb-6">
                        Can't find what you're looking for? Our support team is here to help.
                    </p>
                    <div className="space-x-4">
                        <Link
                            href="/support"
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            Contact Support
                        </Link>
                        <a
                            href="mailto:support@virtualaddresshub.co.uk"
                            className="border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors inline-block"
                        >
                            Email Us
                        </a>
                    </div>
                </div>
            </div>

            {/* JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
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
                    })
                }}
            />
        </div>
    );
}
