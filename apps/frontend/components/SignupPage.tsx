"use client";

import { useSignup } from '../hooks/useSignup';
import { SignupStep1 } from './signup/SignupStep1';
import { SignupStep2 } from './signup/SignupStep2';
import { SignupStep3 } from './signup/SignupStep3';
import { CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

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
                <div className="w-full max-w-2xl">
                    <div className="card-modern p-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-success to-success/90 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4 text-gradient">Welcome to VirtualAddressHub!</h1>
                        <p className="text-lg text-muted-foreground mb-8 text-balance">
                            Your account has been created successfully. You'll receive an email with next steps shortly.
                        </p>
                        
                        <div className="space-y-4">
                            <Button
                                onClick={() => onNavigate?.('home')}
                                className="w-full btn-primary"
                            >
                                Return to Home
                            </Button>
                            <Button
                                onClick={resetSignup}
                                variant="outline"
                                className="w-full btn-outline"
                            >
                                Start Another Signup
                            </Button>
                        </div>
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
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Loading signup...</p>
                    </div>
                </div>
            );
    }
}