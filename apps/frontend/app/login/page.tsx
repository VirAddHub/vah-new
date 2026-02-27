"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

// Map backend error codes to user-friendly messages
function getLoginErrorMessage(backendError: string | undefined): { message: string; showResetHint: boolean } {
    if (!backendError) {
        return {
            message: 'The email or password you entered is incorrect.',
            showResetHint: true,
        };
    }

    const errorLower = backendError.toLowerCase().trim();

    // Map technical error codes to friendly messages
    if (errorLower === 'invalid_credentials' || errorLower.includes('invalid') || errorLower.includes('credentials')) {
        return {
            message: 'The email or password you entered is incorrect.',
            showResetHint: true,
        };
    }

    if (errorLower.includes('not found') || errorLower.includes('user not found')) {
        return {
            message: 'The email or password you entered is incorrect.',
            showResetHint: true,
        };
    }

    if (errorLower.includes('password')) {
        return {
            message: 'The email or password you entered is incorrect.',
            showResetHint: true,
        };
    }

    // For other errors, use a generic message
    return {
        message: 'We couldn\'t sign you in. Please check your details or reset your password.',
        showResetHint: true,
    };
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showResetHint, setShowResetHint] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailChanged, setEmailChanged] = useState(false);
    // Hard guard to prevent double-submit
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        // Check if redirected from email confirmation
        if (searchParams.get('email_changed') === 'true') {
            setEmailChanged(true);
            // Remove query param from URL
            router.replace('/login', { scroll: false });
        }
    }, [searchParams, router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Hard guard to prevent double-submit
        if (isSubmittingRef.current) {
            console.warn('[Login] Submit blocked - already submitting');
            return;
        }

        isSubmittingRef.current = true;
        setError('');
        setShowResetHint(false);
        setLoading(true);

        try {
            // IMPORTANT: Use BFF route, not direct backend call
            const response = await fetch('/api/bff/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                const errorInfo = getLoginErrorMessage(data.error || data.message);
                setError(errorInfo.message);
                setShowResetHint(errorInfo.showResetHint);
                setLoading(false);
                isSubmittingRef.current = false;
                return;
            }

            // Backend sets httpOnly cookies (vah_session, vah_role, vah_user)
            // Phase A: Also store in localStorage for legacy support
            const token = data.data?.token || data.token;
            if (token) {
                localStorage.setItem('vah_jwt', token);
            }

            const user = data.data?.user || data.user;
            if (user) {
                localStorage.setItem('vah_user', JSON.stringify(user));
            }

            // Redirect to mail inbox (or admin dashboard for admins)
            const isAdmin = user?.is_admin || user?.role === 'admin';
            window.location.href = isAdmin ? '/admin/dashboard' : '/mail';

        } catch (err: any) {
            console.error('Login error:', err);
            setError('Failed to connect to server. Please try again.');
            setShowResetHint(false);
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-neutral-100 flex flex-col">
            {/* Back to homepage - top left */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 px-1">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    Back to homepage
                </Link>
            </div>

            {/* Centred card */}
            <div className="flex items-center justify-center flex-1 px-4 sm:px-6 py-12 sm:py-16">
                <div className="w-full max-w-[420px] sm:max-w-[480px]">
                    <div className="bg-white rounded-3xl border border-neutral-200 shadow-lg shadow-neutral-200/50 p-6 sm:p-8">
                        {/* Title & subtitle */}
                        <div className="mb-6 sm:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900">Login</h1>
                            <p className="mt-1.5 text-neutral-500 text-sm sm:text-base">Sign in to your account</p>
                        </div>

                        {/* Success Alert - Email Changed */}
                        {emailChanged && (
                            <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-900/20">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    Your email address has been updated successfully. Please log in with your new email address.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Error Alert */}
                        {error && (
                            <Alert className="mb-6 border-destructive/50 text-destructive">
                                <AlertDescription className="space-y-2">
                                    <div className="font-medium">{error}</div>
                                    {showResetHint && (
                                        <div className="text-sm text-muted-foreground mt-2">
                                            Forgot your password? You can reset it below.
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Login Form - unchanged behaviour */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-neutral-700">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11 w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-neutral-700">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11 w-full"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>

                            <p className="text-xs text-neutral-400 text-center">Secure sign in • UK GDPR compliant</p>
                        </form>

                        {/* Forgot password (more prominent) then Sign up */}
                        <div className="mt-6 space-y-4">
                            <div className="text-center">
                                <Link
                                    href="/reset-password"
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                            <div className="border-t border-neutral-200 pt-4 text-center">
                                <span className="text-sm text-neutral-500">Don&apos;t have an account? </span>
                                <Link
                                    href="/signup"
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    Sign up
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Terms & Privacy */}
            <footer className="py-4 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <Link href="/terms" className="hover:text-neutral-700 transition-colors">
                        Terms of Service
                    </Link>
                    <span className="text-neutral-400" aria-hidden>·</span>
                    <Link href="/privacy" className="hover:text-neutral-700 transition-colors">
                        Privacy Policy
                    </Link>
                </div>
            </footer>
        </div>
    );
}
