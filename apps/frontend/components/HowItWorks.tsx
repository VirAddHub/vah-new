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
                <header className="mb-6 text-center sm:mb-8 md:mb-10 lg:mb-16">
                    <h2 id="how-it-works-heading" className="mb-2 text-h2 sm:mb-3 sm:text-h1 lg:text-display text-foreground">
                        How It Works
                    </h2>
                    <p className="text-body-sm text-muted-foreground sm:text-body lg:text-body-lg">
                        Getting started is simple
                    </p>
                </header>

                {/* Mobile: compact vertical step list (< lg) */}
                <div className="lg:hidden">
                    <div className="mx-auto max-w-md">
                        {steps.map((step) => {
                            const Icon = step.LucideIcon;
                            return (
                                <div key={step.k} className="flex items-start gap-4 py-4">
                                    <span
                                        aria-hidden="true"
                                        className="h-9 w-9 shrink-0 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mt-0.5"
                                    >
                                        <Icon className="h-4 w-4 text-primary" />
                                    </span>
                                    <div>
                                        <h3 className="text-body font-semibold text-foreground">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1 text-body-sm text-muted-foreground">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop (lg+): 3-column grid */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-3 gap-12 text-center">
                        {steps.map((step) => (
                            <div key={step.k} className="flex flex-col items-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 border border-primary/20 shrink-0">
                                    <step.LucideIcon strokeWidth={1.5} className="h-10 w-10 text-primary" />
                                </div>
                                <h3 className="mt-6 text-h4 text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-body text-muted-foreground max-w-[260px]">
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
