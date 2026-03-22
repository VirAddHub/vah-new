'use client';

import { Mail, MapPin, ShieldCheck } from 'lucide-react';

const steps = [
    {
        k: 'verify',
        title: 'Verify Your Account',
        description: 'Verify your account by completing the required identity checks for regulated address services.',
        LucideIcon: ShieldCheck,
    },
    {
        k: 'use',
        title: 'Start using your address',
        description: 'Once approved, you can begin using your address across your company records and business communications.',
        LucideIcon: MapPin,
    },
    {
        k: 'handle',
        title: 'We process your post',
        description: 'Incoming mail is logged, scanned, and added to your dashboard for secure online access.',
        LucideIcon: Mail,
    },
];

export default function HowItWorks() {
    return (
        <section className="w-full bg-background pt-12 pb-16 sm:pb-20 lg:pt-24 lg:pb-24" aria-labelledby="how-it-works-heading">
            <div className="safe-pad mx-auto w-full max-w-[1280px] px-6 sm:px-8 lg:px-12">
                <header className="mb-6 text-center sm:mb-8 md:mb-10 lg:mb-[60px]">
                    <h2 id="how-it-works-heading" className="mb-2 text-2xl font-semibold text-foreground sm:mb-3 sm:text-3xl md:text-4xl lg:text-[44px] lg:leading-[1.1]">
                        How It Works
                    </h2>
                    <p className="text-sm text-muted-foreground sm:text-base md:text-base lg:text-[18px] lg:leading-[1.4]">
                        Getting started is simple
                    </p>
                </header>

                {/* Mobile: compact step list (< lg) — no number badges, no large icon bubbles */}
                <div className="lg:hidden">
                    <div className="mx-auto max-w-md px-4">
                        {steps.map((step, index) => {
                            const Icon = step.LucideIcon;
                            return (
                                <div
                                    key={step.k}
                                    className="relative flex items-start gap-3 py-4"
                                >
                                    {index < steps.length - 1 && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute left-[18px] top-12 h-[calc(100%-2.5rem)] w-px bg-zinc-200"
                                        />
                                    )}
                                    <span
                                        aria-hidden="true"
                                        className="h-9 w-9 shrink-0 rounded-full border border-emerald-100 bg-emerald-50 flex items-center justify-center mt-0.5"
                                    >
                                        <Icon className="h-4 w-4 text-emerald-700" />
                                    </span>
                                    <div>
                                        <h3 className="text-[17px] leading-6 font-semibold text-zinc-900">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-zinc-600">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop: original layout (lg+) */}
                <div className="relative hidden lg:block">
                    <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 -translate-y-2 h-full w-full text-primary"
                        viewBox="0 0 1000 200"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M 166 80 C 320 10 380 10 500 80 C 620 150 680 150 834 80"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="2 8"
                        />
                    </svg>

                    <div className="grid grid-cols-3 gap-12 text-center">
                        {steps.map((step, index) => (
                            <div key={step.k} className="relative z-10 flex flex-col items-center">
                                <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                    {index + 1}
                                </div>
                                <div className="mt-4 flex h-[80px] w-[80px] items-center justify-center text-primary rounded-full bg-emerald-50 border border-emerald-100 shrink-0">
                                    <step.LucideIcon strokeWidth={1.5} className="h-10 w-10 text-emerald-700" />
                                </div>
                                <h3 className="mt-4 text-[18px] font-medium text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-[16px] leading-[1.4] text-muted-foreground">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
