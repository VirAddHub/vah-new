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
            <div className="bg-white">
                <section className="py-16 lg:py-24">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" strokeWidth={2} />
                                <p className="text-neutral-600">Loading pricing plans...</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <section className="py-16 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    {/* Header with billing toggle */}
                    <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between mb-12">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-semibold text-neutral-900 leading-tight tracking-tight">
                                Simple, Transparent Pricing
                            </h1>
                            <p className="mt-4 max-w-2xl text-lg text-neutral-600 leading-relaxed">
                                One plan. Everything you need for a compliant, professional London presence.
                            </p>
                        </div>

                        {/* Billing Toggle */}
                        <div role="group" aria-label="Billing period" className="bg-neutral-100 flex h-11 w-fit items-center rounded-lg p-1">
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`h-full rounded-md px-6 text-sm font-medium transition-colors ${!isAnnual
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`h-full rounded-md px-6 text-sm font-medium transition-colors ${isAnnual
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                    }`}
                            >
                                Annual
                            </button>
                        </div>
                    </div>

                    {/* Main content grid */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {/* Main pricing card - 2 columns */}
                        <div className="lg:col-span-2">
                            <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 lg:p-10">
                                {/* Plan header */}
                                <div className="mb-8">
                                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Virtual Mailbox</p>
                                    <h2 className="text-2xl lg:text-3xl font-semibold text-neutral-900 mt-2 leading-tight">
                                        London Business Address + Same-Day Digital Mail
                                    </h2>
                                </div>

                                {/* Pricing */}
                                <div className="inline-flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-semibold text-neutral-900">
                                            {getPlanPrice(isAnnual ? 'annual' : 'monthly') ? `£${getPlanPrice(isAnnual ? 'annual' : 'monthly')}` : 'Loading...'}
                                        </span>
                                        <span className="text-lg text-neutral-600">
                                            {isAnnual ? '/year' : '/month'}
                                        </span>
                                    </div>
                                    {isAnnual && getMonthlyEquivalent() && (
                                        <p className="text-sm text-neutral-600">
                                            ≈ £{getMonthlyEquivalent()}/month · 2 months free
                                        </p>
                                    )}
                                    <p className="text-sm text-neutral-500">Cancel anytime. No hidden fees.</p>
                                </div>

                                {/* Separator */}
                                <div className="bg-neutral-200 h-px w-full my-8"></div>

                                {/* Features grid */}
                                <div className="grid gap-10 md:grid-cols-2">
                                    {/* Included features */}
                                    <div>
                                        <h3 className="text-xl font-semibold text-neutral-900 mb-4">Included</h3>
                                        <ul className="space-y-3 text-sm text-neutral-600">
                                            {includedFeatures.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                                    <span className="leading-relaxed">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Your Mail, Your Rules */}
                                    <div>
                                        <h3 className="text-xl font-semibold text-neutral-900 mb-4">Your Mail, Your Rules</h3>
                                        <ul className="space-y-3 text-sm text-neutral-600">
                                            {mailRulesFeatures.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                                    <span className="leading-relaxed">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* International forwarding note */}
                                        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 flex items-start gap-3">
                                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-500" strokeWidth={2} />
                                            <p className="leading-relaxed">
                                                International forwarding is available on request and billed at carrier rates with a small handling fee.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="mt-8 flex flex-col gap-3">
                                    <Button
                                        onClick={handleSelectPlan}
                                        disabled={loading}
                                        size="lg"
                                        className="h-12 px-8 w-full sm:w-auto rounded-lg font-medium"
                                    >
                                        Get Started
                                    </Button>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => onNavigate('terms')}
                                            className="h-10 px-6 rounded-lg"
                                        >
                                            View Terms
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => onNavigate('privacy')}
                                            className="h-10 px-6 rounded-lg"
                                        >
                                            Privacy Policy
                                        </Button>
                                    </div>
                                </div>

                                {/* Service note */}
                                <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
                                    Service activates after quick ID verification. You can switch billing period in your dashboard at any time.
                                </p>
                            </div>
                        </div>

                        {/* Sidebar - At a glance */}
                        <aside>
                            <div className="rounded-2xl border border-neutral-200 bg-white p-8">
                                <h3 className="text-2xl font-semibold text-neutral-900">At a glance</h3>
                                <ul className="mt-6 space-y-3 text-sm text-neutral-600">
                                    {atAGlanceFeatures.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                            <span className="leading-relaxed">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Separator */}
                                <div className="bg-neutral-200 h-px w-full my-6"></div>

                                {/* Support links */}
                                <div className="text-sm text-neutral-600 leading-relaxed">
                                    Questions?{' '}
                                    <button
                                        className="text-primary hover:text-primary/80 transition-colors font-medium"
                                        onClick={() => onNavigate('contact')}
                                    >
                                        Email support
                                    </button>
                                    {' '}or{' '}
                                    <button
                                        className="text-primary hover:text-primary/80 transition-colors font-medium"
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
            </section>
        </div>
    );
}
