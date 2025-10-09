"use client";

import { useSignup } from '../hooks/useSignup';
import { SignupStep1 } from './signup/SignupStep1';
import { SignupStep2 } from './signup/SignupStep2';
import { SignupStep3 } from './signup/SignupStep3';

interface SignupPageProps {
    onNavigate?: (page: string) => void;
    initialBilling?: 'monthly' | 'annual';
}

export function SignupPage({ onNavigate, initialBilling }: SignupPageProps) {
    // Add debugging for deployment issues
    console.log('SignupPage component loaded', { initialBilling });

    const {
        currentStep,
        step1Data,
        step2Data,
        isComplete,
        isLoading,
        error,
        goToStep1,
        goToStep2,
        goToStep3,
        goBack,
        completeSignup,
        resetSignup,
    } = useSignup();

    // Add error logging
    if (error) {
        console.error('SignupPage error:', error);
    }

    // If signup is complete, show success message
    if (isComplete) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-2xl text-center">
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-4 text-primary">Welcome to VirtualAddressHub!</h1>
                        <p className="text-lg text-muted-foreground mb-8">
                            Your account has been created successfully. You'll receive an email with next steps shortly.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="w-full flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-md px-6"
                        >
                            Return to Home
                        </button>
                        <button
                            onClick={resetSignup}
                            className="w-full flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-12 rounded-md px-6"
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
        case 1:
            return (
                <SignupStep1
                    onNext={goToStep2}
                    onBack={() => onNavigate?.('home')}
                    initialBilling={initialBilling}
                />
            );
        case 2:
            return (
                <SignupStep2
                    onNext={goToStep3}
                    onBack={goBack}
                    initialData={step2Data || undefined}
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
                />
            );
        default:
            return null;
    }
}
