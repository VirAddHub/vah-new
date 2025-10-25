'use client';

import { Check } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify your account',
        points: [
            'Create your account and upload ID & proof of address (KYC/AML).',
            'We review and confirm. You\'ll be notified when approved.',
            'Your Central London address appears in your dashboard once approved.'
        ]
    },
    {
        k: 'use',
        title: 'Use your address everywhere',
        points: [
            'Update Companies House (Registered Office & Director\'s Service Address).',
            'Use with HMRC, banks, suppliers and clients.',
            'A real, physical address — never a P.O. Box.'
        ]
    },
    {
        k: 'handle',
        title: 'We handle your mail',
        points: [
            'Same-day letter scanning on business days to your dashboard.',
            'Free UK forwarding for HMRC & Companies House letters (on request).',
            'Other UK letters forwarded for £2 per item + postage. Letters only — no parcels.'
        ]
    }
];

export default function HowItWorks() {
    return (
        <section className="w-full py-8">
            <div className="mx-auto max-w-6xl px-6">
                <header className="mx-auto max-w-3xl text-center mb-8">
                    <h2 className="font-bold text-[clamp(1.75rem,4.5vw,3rem)] leading-tight text-primary">
                        How it works — clear, compliant, no surprises
                    </h2>
                    <p className="mt-3 text-base text-black">
                        Verification first. Address issued next. Then professional mail handling.
                    </p>
                </header>

                {/* horizontal layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {steps.map((s, i) => (
                        <div key={s.k} className="relative">
                            {/* number badge */}
                            <div className="absolute -top-3 left-4 z-10">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm">
                                    <span className="font-medium text-neutral-800 text-sm">{i + 1}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card shadow-sm h-full">
                                <div className="p-4 pt-6">
                                    <h3 className="font-bold text-lg text-primary mb-3">{s.title}</h3>
                                    <ul className="space-y-2">
                                        {s.points.map((p) => (
                                            <li key={p} className="flex gap-2 text-sm text-black">
                                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
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
                <p className="mt-8 text-sm text-muted-foreground">
                    Transparent pricing: one plan at £9.99/month. HMRC & Companies House forwarding free on request.
                </p>
            </div>
        </section>
    );
}
