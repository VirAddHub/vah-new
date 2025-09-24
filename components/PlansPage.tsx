"use client";

import React, { useState } from 'react';
import { Check, Info } from 'lucide-react';

interface PlansPageProps {
    onNavigate: (page: string) => void;
}

export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const includedFeatures = [
        'Use as Registered Office & Director\'s Service Address (Companies House + HMRC).',
        'Professional London business address for banking, invoices & websites.',
        'Unlimited digital mail scanning — uploaded same day it arrives.',
        'Secure online dashboard to read, download, archive or request actions.',
        'HMRC & Companies House mail: digital scan + physical forwarding at no charge.',
        'Cancel anytime. No setup fees or long-term contracts.',
        'UK support — Mon-Fri, 9AM–6PM GMT.'
    ];

    const mailRulesFeatures = [
        'Unlimited digital mail included for all senders.',
        'Optional physical forwarding on request from your dashboard.',
        'HMRC & Companies House mail forwarded to a UK address free of charge.',
        'All other UK mail forwarding: flat £2 per item, plus postage at carrier rates.'
    ];

    const atAGlanceFeatures = [
        'Central London address (never a PO Box).',
        'Compliant with Companies House rules.',
        'ICO registered • HMRC AML supervised.',
        'Digital delivery same business day.',
        'Forwarding billed to your subscription.'
    ];

    return (
        <div className="bg-background">
            <section className="py-12 bg-background text-foreground">
                <div className="container mx-auto px-6 sm:px-8 lg:px-12">
                    <div className="mx-auto max-w-7xl">
                        {/* Header with billing toggle */}
                        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-primary">
                                    Simple, Transparent Pricing
                                </h2>
                                <p className="mt-3 max-w-2xl text-muted-foreground text-lg">
                                    One plan. Everything you need for a compliant, professional London presence— with same-day digital mail and full control from your dashboard.
                                </p>
                            </div>

                            {/* Billing Toggle */}
                            <div role="group" aria-label="Billing period" className="bg-muted flex h-11 w-fit items-center rounded-md p-1 text-sm">
                                <div className="grid h-full grid-cols-2 w-full">
                                    <button
                                        onClick={() => setIsAnnual(false)}
                                        className={`h-full rounded-md px-5 font-semibold transition-all ${!isAnnual
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setIsAnnual(true)}
                                        className={`h-full rounded-md px-5 font-semibold transition-all flex items-center justify-center gap-2 ${isAnnual
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Annual
                                        <span className="items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden hidden sm:inline-flex bg-primary/10 text-primary border-primary/20">
                                            Save 25%
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main content grid */}
                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Main pricing card - 2 columns */}
                            <div className="lg:col-span-2">
                                <div className="relative rounded-lg border border-border bg-card p-5 shadow-sm">
                                    {/* Plan header */}
                                    <div className="mb-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-primary font-semibold">Virtual Mailbox</p>
                                            <h3 className="text-2xl font-semibold mt-1 text-primary">
                                                London Business Address + Same-Day Digital Mail
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="flex flex-wrap items-baseline gap-3">
                                        <div className="leading-none">
                                            <span className="text-4xl font-semibold text-primary">
                                                £{isAnnual ? '89.99' : '9.99'}
                                            </span>
                                            <span className="ml-1 text-base text-primary">
                                                {isAnnual ? '/year' : '/month'}
                                            </span>
                                        </div>
                                        {isAnnual && (
                                            <p className="text-sm text-primary mt-1">
                                                ≈ £7.50/month • 2 months free
                                            </p>
                                        )}
                                        <p className="text-sm text-primary">Cancel anytime. No hidden fees.</p>
                                    </div>

                                    {/* Separator */}
                                    <div className="bg-border shrink-0 h-px w-full my-5"></div>

                                    {/* Features grid */}
                                    <div className="grid gap-8 md:grid-cols-2">
                                        {/* Included features */}
                                        <div>
                                            <h4 className="mb-3 font-medium text-primary">Included</h4>
                                            <ul className="space-y-3 text-sm text-foreground/90">
                                                {includedFeatures.map((feature, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        </span>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Your Mail, Your Rules */}
                                        <div>
                                            <h4 className="mb-3 font-medium text-primary">Your Mail, Your Rules</h4>
                                            <ul className="space-y-3 text-sm text-foreground/90">
                                                {mailRulesFeatures.map((feature, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        </span>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* International forwarding note */}
                                            <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                                                <Info className="h-4 w-4 mt-0.5" />
                                                <p>
                                                    International forwarding is available on request and billed at carrier rates (postage) with a small handling fee shown at checkout — charged to your subscription, not before dispatch.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-6 flex flex-col gap-3">
                                        <button
                                            onClick={() => onNavigate('signup')}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-6 w-full sm:w-auto sm:min-w-48 font-medium transition-colors"
                                        >
                                            Create account — £{isAnnual ? '89.99' : '9.99'}{isAnnual ? '/yr' : '/mo'}
                                        </button>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                            <button
                                                onClick={() => onNavigate('terms')}
                                                className="border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 rounded-md px-6 w-full font-medium transition-colors"
                                            >
                                                View Terms
                                            </button>
                                            <button
                                                onClick={() => onNavigate('privacy')}
                                                className="border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 rounded-md px-6 w-full font-medium transition-colors"
                                            >
                                                View Privacy Policy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Service note */}
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Service activates after quick ID verification. You can switch billing period in your dashboard at any time.
                                    </p>
                                </div>
                            </div>

                            {/* Sidebar - At a glance */}
                            <aside>
                                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                                    <h4 className="text-xl font-semibold text-primary">At a glance</h4>
                                    <ul className="mt-4 space-y-3 text-sm text-foreground/90">
                                        {atAGlanceFeatures.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                                    <Check className="h-3.5 w-3.5 text-primary" />
                                                </span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Separator */}
                                    <div className="bg-border shrink-0 h-px w-full my-5"></div>

                                    {/* Support links */}
                                    <div className="text-sm text-muted-foreground">
                                        Questions?{' '}
                                        <a
                                            className="text-primary underline underline-offset-4 hover:text-primary/80 cursor-pointer"
                                            onClick={() => onNavigate('contact')}
                                        >
                                            Email support
                                        </a>
                                        {' '}or{' '}
                                        <button
                                            className="text-primary underline underline-offset-4 hover:text-primary/80"
                                            onClick={() => onNavigate('faq')}
                                        >
                                            read the FAQs
                                        </button>
                                        .
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
