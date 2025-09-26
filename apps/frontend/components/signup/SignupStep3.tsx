import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Shield, AlertTriangle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollToTopButton } from '../ScrollToTopButton';

interface SignupStep3Props {
    onComplete: () => void;
    onBack: () => void;
    billing: 'monthly' | 'annual';
    price: string;
    step2Data?: unknown;
    isLoading?: boolean;
    error?: string | null;
}

export function SignupStep3({ onComplete, onBack, billing, price, step2Data, isLoading = false, error }: SignupStep3Props) {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'direct_debit' | 'card'>('direct_debit');
    const [isProcessing, setIsProcessing] = useState(false);

    const isAnnual = billing === 'annual';
    const planName = isAnnual ? 'Annual Plan' : 'Monthly Plan';
    const planDescription = isAnnual
        ? 'Annual subscription (2 months free)'
        : 'Monthly subscription';

    const displayPrice = isAnnual ? '£89.99' : '£9.99';
    const priceUnit = isAnnual ? '/year' : '/month';
    const totalDescription = isAnnual
        ? '£89.99 today for 12 months (≈ £7.50/month)'
        : 'Recurring monthly payment';

    const handlePayment = async () => {
        setIsProcessing(true);
        // Call the real signup completion (which calls the API)
        onComplete();
    };

    const nextSteps = [
        {
            step: 1,
            title: "Your London address is activated immediately."
        },
        {
            step: 2,
            title: "We&apos;ll send your welcome pack with clear next steps."
        },
        {
            step: 3,
            title: "You&apos;ll complete identity verification with Sumsub before your first login (required for compliance)."
        },
        {
            step: 4,
            title: "Access your secure dashboard to manage mail and settings."
        }
    ];

    return (
        <main className="flex-1">
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
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
                            <div className="flex items-center gap-2" aria-label="Step progress">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    ✓
                                </div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    ✓
                                </div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    3
                                </div>
                            </div>
                        </div>

                        <h1 className="mb-2">Complete Your Payment</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Secure your London address with our trusted payment partner GoCardless. Your subscription begins immediately after payment; you'll then complete identity verification with Sumsub before first login.
                        </p>
                    </div>

                    {/* Order Summary Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mb-8">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none">Order Summary</h4>
                        </div>
                        <div className="px-6 pb-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{planName}</p>
                                        <p className="text-sm text-muted-foreground">{planDescription}</p>
                                    </div>
                                    <p className="font-medium">
                                        {displayPrice}
                                        <span className="text-sm text-muted-foreground">{priceUnit}</span>
                                    </p>
                                </div>
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center font-medium">
                                        <p>Total today</p>
                                        <p>{displayPrice}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{totalDescription}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selection Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mb-8">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none">Choose Payment Method</h4>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            {/* Direct Debit Option */}
                            <div
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPaymentMethod === 'direct_debit'
                                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                                role="button"
                                aria-pressed={selectedPaymentMethod === 'direct_debit'}
                                onClick={() => setSelectedPaymentMethod('direct_debit')}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'direct_debit'
                                            ? 'border-primary bg-primary'
                                            : 'border-muted-foreground'
                                            }`}>
                                            {selectedPaymentMethod === 'direct_debit' && (
                                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">Direct Debit (Recommended)</p>
                                            <p className="text-sm text-muted-foreground">Secure, regulated by GoCardless</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">Preferred</Badge>
                                </div>
                                {selectedPaymentMethod === 'direct_debit' && (
                                    <div className="mt-3 ml-7 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-primary">
                                            <Check className="h-4 w-4" />
                                            <span>Protected by the Direct Debit Guarantee</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-primary">
                                            <Check className="h-4 w-4" />
                                            <span>No card fees</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-primary">
                                            <Check className="h-4 w-4" />
                                            <span>Easy to cancel anytime</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Credit/Debit Card Option */}
                            <div
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPaymentMethod === 'card'
                                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                                role="button"
                                aria-pressed={selectedPaymentMethod === 'card'}
                                onClick={() => setSelectedPaymentMethod('card')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'card'
                                        ? 'border-primary bg-primary'
                                        : 'border-muted-foreground'
                                        }`}>
                                        {selectedPaymentMethod === 'card' && (
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">Credit/Debit Card</p>
                                        <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Alert */}
                    <Alert className="mb-8">
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Your payment is secure.</strong> We use bank-level encryption and are PCI DSS compliant. We never store your payment details on our servers.
                        </AlertDescription>
                    </Alert>

                    {/* Terms Alert */}
                    <Alert className="mb-8">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            By continuing, you agree to our{' '}
                            <button className="text-primary hover:underline font-medium">
                                Terms of Service
                            </button>{' '}
                            and{' '}
                            <button className="text-primary hover:underline font-medium">
                                Privacy Policy
                            </button>
                            . You can cancel your subscription at any time.
                        </AlertDescription>
                    </Alert>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Payment Button */}
                    <div className="text-center">
                        <ScrollToTopButton
                            onClick={handlePayment}
                            disabled={isProcessing || isLoading}
                            className="h-10 px-6 min-w-64 mb-4 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {isProcessing || isLoading ? 'Processing...' : `Complete Payment – ${displayPrice}`}
                        </ScrollToTopButton>
                        <p className="text-sm text-muted-foreground">
                            You&apos;ll be redirected to GoCardless to set up your {selectedPaymentMethod === 'direct_debit' ? 'Direct Debit' : 'card payment'}.
                        </p>
                    </div>

                    {/* What Happens Next Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mt-8">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none">What happens next?</h4>
                        </div>
                        <div className="px-6 pb-6">
                            <div className="space-y-3 text-sm">
                                {nextSteps.map((item) => (
                                    <div key={item.step} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
                                            {item.step}
                                        </div>
                                        <p>{item.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
