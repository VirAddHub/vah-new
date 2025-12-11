'use client';

import { Check } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify your account',
        points: [
            'Create your account and upload your ID and proof of address (KYC/AML).',
            'We review your details and approve your account in line with HMRC and Companies House requirements.',
            'Companies House now requires identity verification for directors and Persons With Significant Control (PSCs) before a Registered Office address can be used.',
            'Once approved, your Central London address appears in your dashboard, ready to use.'
        ]
    },
    {
        k: 'use',
        title: 'Use your address everywhere',
        points: [
            'Update Companies House (Registered Office & Director\'s Service Address).',
            'Use the same address with HMRC, banks, payment providers, clients and other professional contacts.',
            'It\'s a real Central London address — never a P.O. Box.'
        ]
    },
    {
        k: 'handle',
        title: 'We handle your mail',
        points: [
            'Incoming letters are logged and scanned on the same business day to your dashboard.',
            'HMRC & Companies House letters can be forwarded across the UK for free on request.',
            'Other UK letters are forwarded for £2 per item, which covers postage and admin.',
            'Letters only — no parcels. Everything handled in line with UK data protection and AML rules.'
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
                    {steps.map((s, i) => (
                        <div key={s.k} className="relative">
                            {/* number badge */}
                            <div className="absolute -top-3 left-4 z-10">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-accent shadow-sm">
                                    <span className="font-bold text-white text-sm">{i + 1}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card shadow-sm h-full">
                                <div className="p-4 pt-6">
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

            </div>
        </section>
    );
}
