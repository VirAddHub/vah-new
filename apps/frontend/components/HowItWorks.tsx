'use client';

import { Check } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify your account',
        points: [
            'Create your account and upload ID & proof of address (KYC/AML).',
            'We review and confirm. You'll be notified when approved.',
      'Your Central London address appears in your dashboard once approved.'
        ]
    },
    {
        k: 'use',
        title: 'Use your address everywhere',
        points: [
            'Update Companies House (Registered Office & Director's Service Address).',
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
        <section className="w-full py-16">
            <div className="mx-auto max-w-6xl px-6">
                <header className="mx-auto max-w-3xl text-center mb-12">
                    <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-neutral-900">
                        How it works — clear, compliant, no surprises
                    </h2>
                    <p className="mt-3 text-base text-neutral-600">
                        Verification first. Address issued next. Then professional mail handling.
                    </p>
                </header>

                {/* timeline layout */}
                <ol className="relative grid gap-10 md:gap-12">
                    {steps.map((s, i) => (
                        <li key={s.k} className="relative">
                            {/* number badge */}
                            <div className="absolute -left-0 -top-2 hidden md:block">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm">
                                    <span className="font-medium text-neutral-800">{i + 1}</span>
                                </div>
                            </div>

                            <div className="md:pl-16">
                                <div className="rounded-xl border border-neutral-200 bg-white/70 backdrop-blur-sm shadow-sm">
                                    <div className="p-6 sm:p-8">
                                        <h3 className="font-serif text-2xl text-neutral-900">{s.title}</h3>
                                        <ul className="mt-4 space-y-2.5">
                                            {s.points.map((p) => (
                                                <li key={p} className="flex gap-3 text-neutral-700">
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{p}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* soft footer note */}
                <p className="mt-8 text-sm text-neutral-500">
                    Transparent pricing: one plan at £9.99/month. HMRC & Companies House forwarding free on request.
                </p>
            </div>
        </section>
    );
}
