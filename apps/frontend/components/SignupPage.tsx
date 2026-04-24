"use client";

import { useSignup } from '../hooks/useSignup';
import { SignupStep2 } from './signup/SignupStep2';
import { SignupStep3 } from './signup/SignupStep3';
import { FEATURES } from '../lib/config';

interface SignupPageProps {
    onNavigate?: (page: string) => void;
    initialBilling?: 'monthly' | 'annual';
}

export function SignupPage({ onNavigate, initialBilling }: SignupPageProps) {
    const {
        currentStep,
        step1Data,
        step2Data,
        isComplete,
        isLoading,
        error,
        emailAlreadyExists,
        updateStep1Data,
        goToStep3,
        goBack,
        completeSignup,
        resetSignup,
    } = useSignup(initialBilling);

    // Only show Welcome when signup is complete AND payment is not required.
    // When payments are enabled, success is shown on /signup/payment-return after Stripe completes.
    // Never show Welcome if embedded checkout failed or never mounted.
    if (isComplete && !FEATURES.payments) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="w-full max-w-2xl text-center">
                    <div className="mb-12">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-h1 lg:text-display font-semibold text-foreground mb-4 leading-tight tracking-tight">
                            Welcome to VirtualAddressHub
                        </h1>
                        <p className="text-body-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                            Your account has been created successfully. We've emailed you a secure link to your dashboard, where you'll complete identity verification and start using your London address.
                        </p>
                    </div>

                    <div className="space-y-3 max-w-md mx-auto">
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="w-full flex items-center justify-center whitespace-nowrap text-body font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-lg px-6"
                        >
                            Return to Home
                        </button>
                        <button
                            onClick={resetSignup}
                            className="w-full flex items-center justify-center whitespace-nowrap text-body font-medium transition-colors border border-border bg-card text-foreground hover:bg-muted h-12 rounded-lg px-6"
                        >
                            Start Another Signup
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render the appropriate step
    switch (currentStep) {
        case 2:
            return (
                <SignupStep2
                    onNext={goToStep3}
                    onBack={() => onNavigate?.('home')}
                    initialData={step2Data || undefined}
                    initialBilling={step1Data?.billing}
                    onBillingChange={updateStep1Data}
                />
            );
        case 3:
            return (
                <SignupStep3
                    onComplete={completeSignup}
                    onBack={goBack}
                    billing={step1Data?.billing || 'monthly'}
                    price={step1Data?.price || '9.99'}
                    step2Data={step2Data}
                    isLoading={isLoading}
                    error={error}
                    emailAlreadyExists={emailAlreadyExists}
                />
            );
        default:
            return null;
    }
}
