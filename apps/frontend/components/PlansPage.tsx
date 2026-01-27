'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';
import { Button } from './ui/button';

interface PlansPageProps {
    onNavigate: (page: string, data?: any) => void;
}

export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    // Use the plans hook for consistent data fetching
    const { plans, loading, error } = usePlans();

    // Get dynamic pricing from plans data
    const getPlanPrice = (interval: 'monthly' | 'annual') => {
        const plan = plans?.find(p => p.interval === (interval === 'annual' ? 'year' : 'month'));
        if (plan) {
            return (plan.price_pence / 100).toFixed(2);
        }
        return null;
    };

    const getMonthlyEquivalent = () => {
        const plan = plans?.find(p => p.interval === 'year');
        if (plan) {
            return ((plan.price_pence / 100) / 12).toFixed(2);
        }
        return null;
    };

    // Handle plan selection
    const handleSelectPlan = () => {
        onNavigate('signup', { initialBilling: isAnnual ? 'annual' : 'monthly' });
    };

    // Explanatory block features
    const explanatoryFeatures = [
        'Unlimited same-day digital mail scanning',
        'HMRC & Companies House forwarding free (UK)',
        'Other UK mail forwarded at £2 per item',
        'International forwarding available on request'
    ];

    // At a glance features
    const atAGlanceFeatures = [
        'Central London address (never a PO Box)',
        'Companies House compliant',
        'ICO registered • HMRC AML supervised',
        'Digital delivery same business day'
    ];

    if (loading) {
        return (
            <div className="bg-white">
                <section className="py-16 lg:py-24">
                    <div className="mx-auto max-w-4xl px-6 lg:px-8">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" strokeWidth={2} />
                                <p className="text-neutral-600">Loading pricing...</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const monthlyPrice = getPlanPrice('monthly');
    const annualPrice = getPlanPrice('annual');
    const monthlyEquivalent = getMonthlyEquivalent();

    return (
        <div className="bg-white">
            <section className="py-16 lg:py-24">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight tracking-tight">
                            Pricing
                        </h1>
                        <p className="mt-3 text-base text-neutral-600 leading-relaxed">
                            One plan. Everything included.
                        </p>
                    </div>

                    {/* Single pricing card */}
                    <div className="mx-auto max-w-2xl">
                        <div className="rounded-2xl border border-neutral-200 bg-white p-8 lg:p-10">
                            {/* Plan name */}
                            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                                Virtual Mailbox — London
                            </h2>

                            {/* Billing toggle */}
                            <div role="group" aria-label="Billing period" className="bg-neutral-100 flex h-10 w-full sm:w-fit items-center rounded-lg p-1 mb-6">
                                <button
                                    onClick={() => setIsAnnual(false)}
                                    className={`h-full rounded-md px-6 text-sm font-medium transition-all ${!isAnnual
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setIsAnnual(true)}
                                    className={`h-full rounded-md px-6 text-sm font-medium transition-all ${isAnnual
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-600 hover:text-neutral-900'
                                        }`}
                                >
                                    Annual
                                </button>
                            </div>

                            {/* Price display */}
                            <div className="mb-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-semibold text-neutral-900">
                                        {isAnnual ? (annualPrice ? `£${annualPrice}` : '—') : (monthlyPrice ? `£${monthlyPrice}` : '—')}
                                    </span>
                                    <span className="text-lg text-neutral-600">
                                        {isAnnual ? '/ year' : '/ month'}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-neutral-600">
                                    {isAnnual ? '2 months free. Billed annually.' : 'Everything included. Cancel anytime.'}
                                </p>
                            </div>

                            {/* Primary CTA */}
                            <Button
                                onClick={handleSelectPlan}
                                disabled={loading}
                                size="lg"
                                className="h-12 px-8 w-full rounded-lg font-medium mb-2"
                            >
                                Get Started
                            </Button>

                            {/* Helper text below CTA */}
                            <p className="text-xs text-center text-neutral-500 mb-8">
                                {isAnnual 
                                    ? monthlyEquivalent ? `Equivalent to £${monthlyEquivalent} / month.` : ''
                                    : 'Switch to annual anytime and save 2 months.'
                                }
                            </p>

                            {/* Error Display */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Separator */}
                            <div className="bg-neutral-200 h-px w-full mb-8"></div>

                            {/* Explanatory block */}
                            <div className="mb-8">
                                <h3 className="text-base font-semibold text-neutral-900 mb-4">
                                    Your mail. Your rules.
                                </h3>
                                <ul className="space-y-2.5 text-sm text-neutral-600">
                                    {explanatoryFeatures.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                            <span className="leading-relaxed">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
                                    You only pay for physical forwarding when you need it.
                                </p>
                            </div>

                            {/* Separator */}
                            <div className="bg-neutral-200 h-px w-full mb-8"></div>

                            {/* At a glance */}
                            <div>
                                <h3 className="text-base font-semibold text-neutral-900 mb-4">
                                    At a glance
                                </h3>
                                <ul className="space-y-2.5 text-sm text-neutral-600">
                                    {atAGlanceFeatures.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                            <span className="leading-relaxed">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
