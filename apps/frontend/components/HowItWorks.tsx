'use client';

import { Check } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify your account',
        points: [
            'Create your account and upload ID & proof of address (KYC/AML).',
            'We review your details and approve your account.',
            'Companies House now requires identity verification for all directors and Persons With Significant Control (PSCs) before a Registered Office address can be used.',
            'Your Central London address appears in your dashboard once everything is complete.'
        ]
    },
    {
        k: 'use',
        title: 'Use your address everywhere',
        points: [
            'Update Companies House (Registered Office & Director\'s Service Address).',
            'Use with HMRC, banks, suppliers and clients.',
            'A real central London address — never a P.O. Box.'
        ]
    },
    {
        k: 'handle',
        title: 'We handle your mail',
        points: [
            'Same-day letter scanning on business days to your dashboard.',
            'Free UK forwarding for HMRC & Companies House letters (on request).',
            'Other UK letters forwarded for £2 per item, which covers postage and admin.',
            'Letters only — no parcels.'
        ]
    }
];

export default function HowItWorks() {
    return (
        <section className="w-full py-8">
            <div className="mx-auto max-w-6xl px-6">
                <header className="mx-auto max-w-3xl text-center mb-8">
                    <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
                        How it works — clear, compliant, no surprises
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                        Verification first. Address issued next. Then professional mail handling.
                    </p>
                </header>

                {/* horizontal layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {steps.map((s) => (
                        <div key={s.k} className="relative">
                            <div className="rounded-xl border border-border bg-card shadow-sm h-full">
                                <div className="p-4">
                                    <h3 className="text-base font-semibold mb-3">{s.title}</h3>
                                    <ul className="space-y-2">
                                        {s.points.map((p) => (
                                            <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                                <span className="leading-relaxed">{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* soft footer note */}
                <p className="mt-8 text-xs text-muted-foreground">
                    Transparent pricing: one plan at £9.99/month. HMRC & Companies House forwarding free on request.
                </p>
            </div>
        </section>
    );
}
