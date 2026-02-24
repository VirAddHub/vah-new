import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Shield, AlertTriangle, Check, Loader2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollToTopButton } from '../ScrollToTopButton';
import { usePlans } from '@/hooks/usePlans';
import { FEATURES } from '@/lib/config';
import { loadStripe } from '@stripe/stripe-js';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout,
} from '@stripe/react-stripe-js';

interface SignupStep3Props {
    onComplete: () => Promise<void>;
    onBack: () => void;
    billing: 'monthly' | 'annual';
    price: string;
    step2Data?: unknown;
    isLoading?: boolean;
    error?: string | null;
    emailAlreadyExists?: boolean;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
    if (!stripePromise) {
        stripePromise = fetch('/api/bff/payments/stripe/publishable-key', { credentials: 'include' })
            .then(r => r.json())
            .then(json => {
                const key = json?.data?.publishable_key;
                if (!key) throw new Error('Missing Stripe publishable key');
                return loadStripe(key);
            })
            .catch(() => null);
    }
    return stripePromise;
}

export function SignupStep3({ onComplete, onBack, billing, price, step2Data, isLoading = false, error, emailAlreadyExists = false }: SignupStep3Props) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const { plans } = usePlans();

    const getPlanPrice = (interval: 'monthly' | 'annual') => {
        const plan = plans?.find(p => p.interval === (interval === 'annual' ? 'year' : 'month'));
        if (plan) return (plan.price_pence / 100).toFixed(2);
        return interval === 'annual' ? '89.99' : '9.99';
    };

    const getMonthlyEquivalent = () => {
        const plan = plans?.find(p => p.interval === 'year');
        if (plan) return ((plan.price_pence / 100) / 12).toFixed(2);
        return '7.50';
    };

    const isAnnual = billing === 'annual';
    const planName = isAnnual ? 'Annual Plan' : 'Monthly Plan';
    const planDescription = isAnnual ? 'Annual subscription (2 months free)' : 'Monthly subscription';
    const displayPrice = isAnnual ? `£${getPlanPrice('annual')}` : `£${getPlanPrice('monthly')}`;
    const priceUnit = isAnnual ? '/year' : '/month';
    const totalDescription = isAnnual
        ? `£${getPlanPrice('annual')} today for 12 months (≈ £${getMonthlyEquivalent()}/month)`
        : 'Recurring monthly payment';

    const fetchClientSecret = useCallback(async () => {
        try {
            const res = await fetch('/api/bff/payments/stripe/checkout-session-embedded', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ billing_period: billing }),
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json?.error || 'Failed to create checkout session');
            }
            return json.data.client_secret as string;
        } catch (e: any) {
            setCheckoutError(e.message || 'Failed to initialise payment. Please try again.');
            return null;
        }
    }, [billing]);

    const handlePayment = async () => {
        if (isProcessing || isLoading) return;
        setIsProcessing(true);
        setCheckoutError(null);

        if (!FEATURES.payments) {
            try { await onComplete(); } finally { setIsProcessing(false); }
            return;
        }

        try {
            // Phase 1: create the account (onComplete calls the signup API)
            await onComplete();
            // If onComplete redirected away (old flow), we won't reach here.
            // For embedded flow, mark account as created.
            setAccountCreated(true);
        } catch {
            // Error is surfaced via the `error` prop from useSignup
            setIsProcessing(false);
            return;
        }

        // Phase 2: fetch embedded checkout client secret
        const secret = await fetchClientSecret();
        if (secret) {
            setClientSecret(secret);
        }
        setIsProcessing(false);
    };

    // If the account was already created in a previous attempt but checkout
    // failed, allow retrying the checkout without re-creating the account.
    const handleRetryCheckout = async () => {
        setCheckoutError(null);
        setIsProcessing(true);
        const secret = await fetchClientSecret();
        if (secret) setClientSecret(secret);
        setIsProcessing(false);
    };

    // Pre-warm Stripe.js on mount
    useEffect(() => { if (FEATURES.payments) getStripePromise(); }, []);

    // --- Embedded Checkout view: stay on Step 3 until Stripe completes. Never show success here. ---
    if (clientSecret) {
        const stripe = getStripePromise();
        if (!stripe) {
            return (
                <main className="flex-1">
                    <div className="min-h-screen bg-background flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl">
                            <div className="text-center mb-6">
                                <h1 className="mb-2">Complete Your Payment</h1>
                                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                                    Your account has been created. Payment setup could not load.
                                </p>
                            </div>
                            <Alert variant="destructive" className="mb-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Payment form could not load. This may be due to a connection issue or missing configuration. Please try again.
                                </AlertDescription>
                            </Alert>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <ScrollToTopButton
                                    onClick={handleRetryCheckout}
                                    disabled={isProcessing}
                                    className="h-10 px-6 inline-flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Try again
                                </ScrollToTopButton>
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="h-10 px-6 inline-flex items-center justify-center gap-2 text-sm font-medium border border-input bg-background rounded-md hover:bg-accent"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            );
        }
        return (
            <main className="flex-1">
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl">
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                            </div>
                            <h1 className="mb-2">Complete Your Payment</h1>
                            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                                Your account has been created. Enter your payment details below to activate your subscription.
                            </p>
                        </div>

                        <div className="bg-card rounded-xl border overflow-hidden">
                            <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
                                <EmbeddedCheckout className="min-h-[400px]" />
                            </EmbeddedCheckoutProvider>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                            <span>Secure payment powered by Stripe</span>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // --- Pre-checkout / account creation view ---
    return (
        <main className="flex-1">
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Header with progress and back button */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <button
                                onClick={onBack}
                                disabled={isProcessing}
                                className="inline-flex items-center justify-center border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3 text-sm font-medium transition-all disabled:opacity-50"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </button>

                            <div className="flex items-center gap-2" aria-label="Step progress">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
                                <div className="w-8 h-1 bg-primary rounded-full"></div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                            </div>
                        </div>

                        <h1 className="mb-2">Complete Your Payment</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Secure your London address with our trusted payment partner Stripe. After payment, you&apos;ll receive login details
                            and complete identity verification (KYC) in your dashboard to activate your address.
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
                                    <p className="font-medium text-neutral-900">
                                        {displayPrice}
                                        <span className="text-sm text-muted-foreground">{priceUnit}</span>
                                    </p>
                                </div>
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center font-medium">
                                        <p>Total today</p>
                                        <p className="text-neutral-900">{displayPrice}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{totalDescription}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border mb-8">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none">Payment Method</h4>
                        </div>
                        <div className="px-6 pb-6">
                            <div className="p-4 border border-primary ring-2 ring-primary/20 bg-primary/5 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        </div>
                                        <div>
                                            <p className="font-medium">Pay securely by card or bank via Stripe</p>
                                            <p className="text-sm text-muted-foreground">Secure, regulated payment processing</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">Secure</Badge>
                                </div>
                                <div className="mt-3 ml-7 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <Check className="h-4 w-4" />
                                        <span>PCI DSS compliant</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <Check className="h-4 w-4" />
                                        <span>No hidden charges</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <Check className="h-4 w-4" />
                                        <span>Easy to cancel anytime</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <Check className="h-4 w-4" />
                                        <span>Powered by Stripe</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Alert */}
                    <Alert className="mb-8">
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Your payment is secure.</strong> We use Stripe for payment processing, which is regulated and PCI DSS compliant. We never store your payment details on our servers.
                        </AlertDescription>
                    </Alert>

                    {/* Terms Alert */}
                    <Alert className="mb-8">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            By continuing, you agree to our{' '}
                            <Link href="/terms" className="text-primary hover:underline font-medium">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-primary hover:underline font-medium">
                                Privacy Policy
                            </Link>
                            . You can cancel your subscription at any time.
                        </AlertDescription>
                    </Alert>

                    {/* Error Display */}
                    {(error || checkoutError) && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                {error || checkoutError}
                                {emailAlreadyExists && (
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <Link
                                            href="/login"
                                            className={cn(
                                                'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium h-9 px-3 text-sm',
                                                'border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-offset-2'
                                            )}
                                        >
                                            Sign in
                                        </Link>
                                        <Link
                                            href="/reset-password"
                                            className={cn(
                                                'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium h-9 px-3 text-sm',
                                                'border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-offset-2'
                                            )}
                                        >
                                            Reset password
                                        </Link>
                                    </div>
                                )}
                                {accountCreated && checkoutError && (
                                    <button
                                        onClick={handleRetryCheckout}
                                        disabled={isProcessing}
                                        className="mt-3 text-sm text-primary hover:underline font-medium"
                                    >
                                        Retry payment setup
                                    </button>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Payment Button */}
                    <div className="text-center">
                        {FEATURES.payments ? (
                            <>
                                <ScrollToTopButton
                                    onClick={accountCreated ? handleRetryCheckout : handlePayment}
                                    disabled={isProcessing || isLoading}
                                    className="h-10 px-6 min-w-64 mb-4 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isProcessing || isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {accountCreated ? 'Loading checkout...' : 'Creating account...'}
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-4 w-4" />
                                            {`Complete Payment – ${displayPrice}`}
                                        </>
                                    )}
                                </ScrollToTopButton>
                                <p className="text-sm text-muted-foreground">
                                    Payment is handled securely by Stripe — right here on this page.
                                </p>
                            </>
                        ) : (
                            <>
                                <ScrollToTopButton
                                    onClick={handlePayment}
                                    disabled={isProcessing || isLoading}
                                    className="h-10 px-6 min-w-64 mb-4 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    {isProcessing || isLoading ? 'Processing...' : `Complete Signup – ${displayPrice}`}
                                </ScrollToTopButton>
                                <p className="text-sm text-muted-foreground">
                                    Payments are disabled on this environment. Your account will be created without payment setup.
                                </p>
                            </>
                        )}
                    </div>

                    {/* What Happens Next Card */}
                    <div className="bg-card border rounded-xl shadow-sm p-6 mt-10 space-y-5">
                        <h3 className="text-lg font-semibold">What happens next</h3>
                        <div className="space-y-4">
                            {[
                                "We'll email you a secure link to your dashboard.",
                                "Sign in and complete identity verification (KYC). This is required for UK AML rules before we can activate your address or forward any mail.",
                                "Once approved, your London address, mail dashboard, and Business Address Confirmation will be fully active."
                            ].map((text, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
