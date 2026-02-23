'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type SessionStatus = 'loading' | 'complete' | 'open' | 'error';

export function PaymentReturnClient() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [status, setStatus] = useState<SessionStatus>('loading');
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            return;
        }

        let cancelled = false;

        async function checkStatus() {
            try {
                const res = await fetch(
                    `/api/bff/payments/stripe/session-status?session_id=${encodeURIComponent(sessionId!)}`,
                    { credentials: 'include' }
                );
                const json = await res.json();
                if (cancelled) return;

                if (!res.ok || !json.ok) {
                    setStatus('error');
                    return;
                }

                const s = json.data?.status;
                const customerEmail = json.data?.customer_email;
                if (customerEmail) setEmail(customerEmail);

                if (s === 'complete') {
                    setStatus('complete');
                } else if (s === 'open') {
                    setStatus('open');
                } else {
                    setStatus('error');
                }
            } catch {
                if (!cancelled) setStatus('error');
            }
        }

        checkStatus();
        return () => { cancelled = true; };
    }, [sessionId]);

    if (status === 'loading') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Verifying your payment...</p>
            </div>
        );
    }

    if (status === 'complete') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-lg text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-semibold text-neutral-900">Payment Successful</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Your subscription is being activated. We&apos;ve sent a confirmation to{' '}
                        {email ? <strong>{email}</strong> : 'your email'}. You can now sign in to your
                        dashboard to complete identity verification and start using your London address.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center h-11 px-8 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Sign in to Dashboard
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center h-11 px-8 rounded-lg text-sm font-medium border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors"
                        >
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'open') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-lg text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                        <RotateCcw className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-3xl font-semibold text-neutral-900">Payment Not Completed</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        It looks like your payment wasn&apos;t completed. You can try again by clicking below.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center h-11 px-8 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Try Again
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-3xl font-semibold text-neutral-900">Something Went Wrong</h1>
                <p className="text-muted-foreground leading-relaxed">
                    We couldn&apos;t verify your payment. If you believe this is an error, please contact support.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center h-11 px-8 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Try Again
                    </Link>
                    <Link
                        href="/help"
                        className="inline-flex items-center justify-center h-11 px-8 rounded-lg text-sm font-medium border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                        Get Help
                    </Link>
                </div>
            </div>
        </div>
    );
}
