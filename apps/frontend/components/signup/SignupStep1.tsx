import React, { useState } from 'react';
import { ArrowLeft, Check, Shield, Mail, Truck, FileText } from 'lucide-react';
import { ScrollToTopButton } from '../ScrollToTopButton';
import { usePlans } from '@/hooks/usePlans';

interface SignupStep1Props {
    onNext: (selectedPlan: { billing: 'monthly' | 'annual'; price: string }) => void;
    onBack: () => void;
    initialBilling?: 'monthly' | 'annual';
}

export function SignupStep1({ onNext, onBack, initialBilling = 'monthly' }: SignupStep1Props) {
    const [billing, setBilling] = useState<'monthly' | 'annual'>(initialBilling);
    const { plans, loading } = usePlans();

    // Get dynamic pricing from plans data
    const getPlanPrice = (interval: 'monthly' | 'annual') => {
        const plan = plans?.find(p => p.interval === (interval === 'annual' ? 'year' : 'month'));
        if (plan) {
            return (plan.price_pence / 100).toFixed(2);
        }
        // Fallback to hardcoded prices if plans not loaded
        return interval === 'annual' ? '89.99' : '9.99';
    };

    const getMonthlyEquivalent = () => {
        const plan = plans?.find(p => p.interval === 'year');
        if (plan) {
            return ((plan.price_pence / 100) / 12).toFixed(2);
        }
        return '7.50'; // Fallback
    };

    const planFeatures = [
        'Professional London business address',
        'Mail scanning & instant email notifications',
        'Secure online dashboard access',
        'HMRC & Companies House forwarding (always free)',
        'Official address certificate',
        'Cancel anytime online'
    ];

    const trustSignals = [
        {
            icon: Shield,
            title: 'HMRC Compliant',
            description: 'Fully compliant with UK regulations'
        },
        {
            icon: Mail,
            title: 'Professional Scanning',
            description: 'High-quality mail scanning service'
        },
        {
            icon: Truck,
            title: 'Gov Mail is Free',
            description: 'HMRC & Companies House forwarding included'
        },
        {
            icon: FileText,
            title: 'Address Certificate',
            description: 'Official proof of address document'
        }
    ];

    const handleContinue = () => {
        onNext({
            billing,
            price: getPlanPrice(billing)
        });
    };

    return (
        <main className="flex-1">
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    {/* Header with progress and back button */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <button
                                onClick={onBack}
                                className="inline-flex items-center justify-center border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3 text-sm font-medium transition-all"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </button>

                            {/* Progress indicator */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    1
                                </div>
                                <div className="w-8 h-1 bg-muted rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                                    2
                                </div>
                                <div className="w-8 h-1 bg-muted rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                                    3
                                </div>
                            </div>
                        </div>

                        <h1 className="mb-4">Choose Your Plan</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            One plan, two ways to pay. Switch between monthly and annual billing anytime.
                        </p>

                        {/* Billing toggle */}
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
                                <button
                                    onClick={() => setBilling('monthly')}
                                    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all h-9 py-2 rounded-lg px-4 ${billing === 'monthly'
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBilling('annual')}
                                    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all h-9 py-2 rounded-lg px-4 ${billing === 'annual'
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                >
                                    Annual
                                    {billing !== 'annual' && (
                                        <span className="items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden hidden sm:inline-flex bg-primary/10 text-primary border-primary/20">
                                            Save 2 months
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main pricing card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mb-8">
                        <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 relative">
                            {/* Badge - varies by billing type */}
                            <div className="absolute -top-3 left-4">
                                {billing === 'monthly' ? (
                                    <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden border-transparent bg-primary text-white">
                                        Most Popular
                                    </span>
                                ) : (
                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden border-transparent bg-primary text-white">
                                            Save 2 months
                                        </span>
                                        <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden border-transparent bg-primary text-white">
                                            Best Value
                                        </span>
                                    </div>
                                )}
                            </div>

                            <h4 className="leading-none">All in One Plan</h4>

                            <div className="mt-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-extrabold text-primary">
                                        {billing === 'monthly' ? `£${getPlanPrice('monthly')}/month` : `£${getPlanPrice('annual')}/year`}
                                    </span>
                                </div>
                                {billing === 'annual' && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        ≈ £{getMonthlyEquivalent()}/month • 2 months free
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    {billing === 'monthly'
                                        ? 'Billed monthly • Cancel anytime'
                                        : `Billed yearly • ≈ £${getMonthlyEquivalent()}/month • Cancel at renewal`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Features list */}
                        <div className="px-6 pb-6">
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {planFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="h-3 w-3 text-primary" />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Trust signals */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mb-8">
                        <div className="px-6 pt-6 pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {trustSignals.map((signal, index) => {
                                    const IconComponent = signal.icon;
                                    return (
                                        <div key={index} className="text-center">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                                <IconComponent className="h-6 w-6 text-primary" />
                                            </div>
                                            <h4 className="font-medium mb-2">{signal.title}</h4>
                                            <p className="text-sm text-muted-foreground">{signal.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Continue button */}
                    <div className="text-center">
                        <ScrollToTopButton
                            onClick={handleContinue}
                            className="w-full flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-md px-6"
                        >
                            Create Account - £{getPlanPrice(billing)}{billing === 'monthly' ? '/mo' : '/year'}
                        </ScrollToTopButton>
                        <p className="text-sm text-muted-foreground mt-4">
                            No payment required yet. Complete your information first.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
