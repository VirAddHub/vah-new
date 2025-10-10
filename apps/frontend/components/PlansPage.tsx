'use client';

import React, { useState, useEffect } from 'react';
import { Check, Info, Loader2, CreditCard, Star, ShieldCheck, Clock, Users } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { usePlans } from '@/hooks/usePlans';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PlansPageProps {
    onNavigate: (page: string, data?: any) => void;
}

export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Use the plans hook for consistent data fetching
    const { plans, loading, error, refetch } = usePlans();

    // Handle plan selection and payment flow
    const handleSelectPlan = async (planId?: string) => {
        try {
            setProcessingPayment(true);
            setPaymentError(null);

            const response = await apiClient.post('/api/payments/redirect-flows', {
                plan_id: planId || 'default',
                billing_period: isAnnual ? 'annual' : 'monthly'
            });

            if (response.ok && response.data?.redirect_url) {
                // Redirect to payment
                window.location.href = response.data.redirect_url;
            } else {
                // Fallback: navigate to signup flow instead of payment
                console.warn('Payment redirect URL not available, falling back to signup flow');
                onNavigate('signup', { initialBilling: isAnnual ? 'annual' : 'monthly' });
            }
        } catch (err) {
            console.error('Payment flow error:', err);
            // Fallback: navigate to signup flow instead of payment
            console.warn('Payment flow failed, falling back to signup flow');
            onNavigate('signup', { initialBilling: isAnnual ? 'annual' : 'monthly' });
        } finally {
            setProcessingPayment(false);
        }
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
                <section className="section-padding">
                    <div className="container-modern">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                                <p className="text-muted-foreground">Loading pricing plans...</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="bg-background">
            <section className="section-padding">
                <div className="container-modern">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="font-bold leading-tight text-[clamp(2rem,5vw,4rem)] text-balance mb-6">
                            Choose Your <span className="text-gradient">Perfect Plan</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance mb-8">
                            Professional London business address service with transparent pricing. No hidden fees, no surprises.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                                Monthly
                            </span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? 'bg-primary' : 'bg-muted'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                                Annual
                            </span>
                            {isAnnual && (
                                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">
                                    Save 20%
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid gap-8 lg:grid-cols-3 mb-16">
                        {/* Basic Plan */}
                        <div className="pricing-card">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Basic</h3>
                                <p className="text-muted-foreground mb-4">Perfect for small businesses</p>
                                <div className="text-4xl font-bold text-gradient mb-2">
                                    £{isAnnual ? '120' : '12'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {isAnnual ? '/year' : '/month'}
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {includedFeatures.slice(0, 4).map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => handleSelectPlan('basic')}
                                disabled={processingPayment}
                                className="w-full btn-outline"
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Choose Basic'
                                )}
                            </Button>
                        </div>

                        {/* Professional Plan - Featured */}
                        <div className="pricing-card featured">
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                                    <Star className="w-3 h-3 mr-1" />
                                    Most Popular
                                </Badge>
                            </div>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                                <p className="text-muted-foreground mb-4">Ideal for growing businesses</p>
                                <div className="text-4xl font-bold text-gradient mb-2">
                                    £{isAnnual ? '180' : '18'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {isAnnual ? '/year' : '/month'}
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {includedFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => handleSelectPlan('professional')}
                                disabled={processingPayment}
                                className="w-full btn-primary"
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Choose Professional'
                                )}
                            </Button>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="pricing-card">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                                <p className="text-muted-foreground mb-4">For large organizations</p>
                                <div className="text-4xl font-bold text-gradient mb-2">
                                    £{isAnnual ? '300' : '30'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {isAnnual ? '/year' : '/month'}
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {includedFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground">Priority support & dedicated account manager</span>
                                </li>
                            </ul>

                            <Button
                                onClick={() => handleSelectPlan('enterprise')}
                                disabled={processingPayment}
                                className="w-full btn-outline"
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Choose Enterprise'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Fully Compliant</h3>
                            <p className="text-muted-foreground">Meets all UK regulations including ECCT Act 2023</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Same-Day Service</h3>
                            <p className="text-muted-foreground">Digital mail scanning within hours of arrival</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Trusted by 1000+</h3>
                            <p className="text-muted-foreground">Businesses across the UK and beyond</p>
                        </div>
                    </div>

                    {/* Mail Rules */}
                    <div className="card-modern p-8 mb-16">
                        <h2 className="text-2xl font-bold mb-6 text-center">Mail Handling Rules</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">What's Included</h3>
                                <ul className="space-y-2">
                                    {mailRulesFeatures.slice(0, 2).map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                            <span className="text-sm text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Additional Services</h3>
                                <ul className="space-y-2">
                                    {mailRulesFeatures.slice(2).map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                                            <span className="text-sm text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* At a Glance */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-8">At a Glance</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            {atAGlanceFeatures.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Display */}
                    {paymentError && (
                        <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                            <p className="text-destructive text-sm">{paymentError}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}