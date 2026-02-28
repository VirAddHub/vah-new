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
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex flex-col flex-1">
                {/* Back to homepage - pill, aligned with container */}
                <div className="pt-4 sm:pt-6 pb-2 z-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        Back to homepage
                    </Link>
                </div>

                {/* Main area - balanced height */}
                <div className="flex items-center justify-center flex-1 min-h-[calc(100vh-120px)] py-8 sm:py-12">
                    <div className="w-full max-w-[480px]">
                        <div className="bg-white rounded-3xl border border-zinc-200 shadow-lg shadow-zinc-200/50 p-6 sm:p-8">
                            {/* Title & subtitle */}
                            <div className="mb-6">
                                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Login</h1>
                                <p className="mt-1.5 text-sm text-zinc-500">Sign in to your account</p>
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
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-zinc-700">Email</Label>
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

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-zinc-700">Password</Label>
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
                                    className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-95 transition-[filter,background]"
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>

                                <p className="text-xs text-zinc-400 text-center pt-0.5">Secure sign in • UK GDPR compliant</p>
                            </form>

                            {/* Forgot password then Sign up */}
                            <div className="mt-6 space-y-4">
                                <div className="text-center">
                                    <Link
                                        href="/reset-password"
                                        className="text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                                    >
                                        Forgot your password?
                                    </Link>
                                </div>
                                <div className="border-t border-zinc-200 pt-4 text-center">
                                    <span className="text-sm text-zinc-500">Don&apos;t have an account? </span>
                                    <Link
                                        href="/signup"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Terms & Privacy */}
                <footer className="py-4 flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <Link href="/terms" className="hover:text-zinc-700 hover:underline transition-colors">
                        Terms of Service
                    </Link>
                    <span className="text-zinc-400" aria-hidden>·</span>
                    <Link href="/privacy" className="hover:text-zinc-700 hover:underline transition-colors">
                        Privacy Policy
                    </Link>
                </footer>
            </div>
        </div>
    );
}
