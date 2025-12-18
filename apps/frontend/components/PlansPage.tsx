'use client';

import React, { useState } from 'react';
import { Check, Info, Loader2, CreditCard } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';
import { Button } from './ui/button';

interface PlansPageProps {
    onNavigate: (page: string, data?: any) => void;
}

export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    // Use the plans hook for consistent data fetching
    const { plans, loading, error, refetch } = usePlans();

    // Get dynamic pricing from plans data
    const getPlanPrice = (interval: 'monthly' | 'annual') => {
        const plan = plans?.find(p => p.interval === (interval === 'annual' ? 'year' : 'month'));
        if (plan) {
            return (plan.price_pence / 100).toFixed(2);
        }
        // Return null if plans not loaded (don't show fallback price)
        return null;
    };

    const getMonthlyEquivalent = () => {
        const plan = plans?.find(p => p.interval === 'year');
        if (plan) {
            return ((plan.price_pence / 100) / 12).toFixed(2);
        }
        return null;
    };

    // Handle plan selection - navigate to signup (payment setup happens after account creation)
    const handleSelectPlan = () => {
        // Simply navigate to signup with billing preference
        // The signup flow will handle payment setup after the user account is created
        onNavigate('signup', { initialBilling: isAnnual ? 'annual' : 'monthly' });
    };

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

    if (loading) {
        return (
            <div className="bg-background">
                <section className="py-12 bg-background text-foreground">
                    <div className="container mx-auto px-6 sm:px-8 lg:px-12">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                                    <p className="text-muted-foreground">Loading pricing plans...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="bg-background">
            <section className="py-12 bg-background text-foreground">
                <div className="container mx-auto px-6 sm:px-8 lg:px-12">
                    <div className="mx-auto max-w-7xl">
                        {/* Header with billing toggle */}
                        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8 md:mb-10">
                            <div>
                                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                                    Simple, Transparent Pricing
                                </h1>
                                <p className="mx-auto mt-2 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
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
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main content grid */}
                        <div className="mt-8 grid grid-cols-1 gap-8 lg:gap-10 lg:grid-cols-3">
                            {/* Main pricing card - 2 columns */}
                            <div className="lg:col-span-2">
                                <div className="relative rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
                                    {/* Plan header */}
                                    <div className="mb-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Virtual Mailbox</p>
                                            <h2 className="text-xl md:text-2xl font-semibold leading-snug mt-1 text-foreground">
                                                London Business Address + Same-Day Digital Mail
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="mt-4 inline-flex flex-col gap-1 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 shadow-sm">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl md:text-5xl font-semibold leading-none text-foreground">
                                                {getPlanPrice(isAnnual ? 'annual' : 'monthly') ? `£${getPlanPrice(isAnnual ? 'annual' : 'monthly')}` : 'Loading...'}
                                            </span>
                                            <span className="text-base md:text-lg text-muted-foreground ml-1">
                                                {isAnnual ? '/year' : '/month'}
                                            </span>
                                        </div>
                                        {isAnnual && getMonthlyEquivalent() && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                ≈ £{getMonthlyEquivalent()}/month • 2 months free
                                            </p>
                                        )}
                                        <p className="text-sm md:text-base text-muted-foreground mt-1">Cancel anytime. No hidden fees.</p>
                                    </div>

                                    {/* Separator */}
                                    <div className="bg-border shrink-0 h-px w-full my-6 md:my-8"></div>

                                    {/* Features grid */}
                                    <div className="grid gap-8 md:grid-cols-2">
                                        {/* Included features */}
                                        <div>
                                            <h3 className="text-lg md:text-xl font-semibold tracking-tight text-foreground mb-3">Included</h3>
                                            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                                                {includedFeatures.map((feature, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        </span>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Your Mail, Your Rules */}
                                        <div>
                                            <h3 className="text-lg md:text-xl font-semibold tracking-tight text-foreground mb-3">Your Mail, Your Rules</h3>
                                            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                                                {mailRulesFeatures.map((feature, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        </span>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* International forwarding note */}
                                            <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs md:text-sm text-muted-foreground flex items-start gap-2">
                                                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <p>
                                                    International forwarding is available on request and billed at carrier rates (postage) with a small handling fee shown at checkout — charged to your subscription, not before dispatch.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Display */}
                                    {error && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="mt-6 flex flex-col gap-3">
                                        <Button
                                            onClick={handleSelectPlan}
                                            disabled={loading}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 w-full sm:w-auto sm:min-w-48 font-medium"
                                        >
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            Choose Plan{getPlanPrice(isAnnual ? 'annual' : 'monthly') ? ` — £${getPlanPrice(isAnnual ? 'annual' : 'monthly')}${isAnnual ? '/yr' : '/mo'}` : ''}
                                        </Button>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                            <Button
                                                variant="outline"
                                                onClick={() => onNavigate('terms')}
                                                className="h-10 px-6 w-full font-medium"
                                            >
                                                View Terms
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => onNavigate('privacy')}
                                                className="h-10 px-6 w-full font-medium"
                                            >
                                                View Privacy Policy
                                            </Button>
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
                                <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
                                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">At a glance</h3>
                                    <ul className="mt-4 space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                                        {atAGlanceFeatures.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
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
