'use client';

import React, { useState } from 'react';
import { usePlans, usePricing } from '@/hooks/usePlans';
import { formatPrice } from '@/lib/formatPrice';
import { Button } from './ui/button';

interface PlansPageProps {
    onNavigate: (page: string, data?: any) => void;
}

export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const { loading, error } = usePlans();
    const { monthlyPrice, annualPrice } = usePricing();

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

    const displayPrice = isAnnual ? formatPrice(annualPrice, { interval: 'year' }) : formatPrice(monthlyPrice, { interval: 'month' });

    return (
        <div className="bg-white">
            <section className="py-12 lg:py-16">
                <div className="mx-auto max-w-6xl px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight tracking-tight">
                            Pricing
                        </h1>
                        <p className="mt-2 text-base text-neutral-600">
                            One plan. Everything included.
                        </p>
                    </div>

                    {/* Pricing card container */}
                    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                        {/* Brand accent line */}
                        <div className="h-0.5 bg-primary"></div>
                        
                        <div className="p-8 lg:p-12">
                            {/* Two-column layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                                
                                {/* LEFT: Decision */}
                                <div>
                                    <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                                        Virtual Mailbox — London
                                    </h2>

                                    {/* Billing toggle */}
                                    <div role="group" aria-label="Billing period" className="bg-neutral-100 flex h-10 w-fit items-center rounded-lg p-1 mb-8">
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
                                                ? 'bg-primary text-white shadow-sm hover:bg-primary'
                                                : 'text-neutral-600 hover:text-neutral-900'
                                                }`}
                                        >
                                            Annual
                                        </button>
                                    </div>

                                    {/* Error Display */}
                                    {error && (
                                        <p className="text-sm text-neutral-600 mb-6">
                                            Pricing temporarily unavailable. Please refresh.
                                        </p>
                                    )}

                                    {/* Price - stable from server/context to avoid flicker */}
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-5xl lg:text-6xl font-semibold text-neutral-900 tabular-nums min-w-[140px] inline-block">
                                                {displayPrice}
                                            </span>
                                        </div>
                                        <div className="inline-block border-b-2 border-primary/20 pb-0.5">
                                            <p className="text-sm text-neutral-600">
                                                {isAnnual ? '2 months free. Billed annually.' : 'Everything included. Cancel anytime.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <Button
                                        onClick={handleSelectPlan}
                                        disabled={loading || !!error}
                                        size="lg"
                                        className="h-12 px-8 w-full sm:w-auto rounded-lg font-medium mb-2"
                                    >
                                        Get Started
                                    </Button>

                                    <p className="text-sm text-neutral-500 tabular-nums">
                                        {isAnnual
                                            ? `Equivalent to ${formatPrice(annualPrice / 12, { interval: 'month' })}`
                                            : 'Switch to annual anytime and save 2 months'
                                        }
                                    </p>
                                </div>

                                {/* RIGHT: Understanding */}
                                <div className="space-y-10">
                                    {/* What's included */}
                                    <div>
                                        <h3 className="text-base font-semibold text-neutral-900 mb-4">
                                            What's included
                                        </h3>
                                        <ul className="space-y-3">
                                            {explanatoryFeatures.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
                                                    <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
                                            You only pay for physical forwarding when you need it.
                                        </p>
                                    </div>

                                    {/* Compliance */}
                                    <div>
                                        <h3 className="text-base font-semibold text-neutral-900 mb-4">
                                            Compliance & trust
                                        </h3>
                                        <ul className="space-y-3">
                                            {atAGlanceFeatures.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
                                                    <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
