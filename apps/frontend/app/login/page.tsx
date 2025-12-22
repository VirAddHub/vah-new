"use client";

import { useState, useEffect, useRef } from 'react';
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

            // Store token in localStorage and cookie
            const token = data.data?.token || data.token;
            if (token) {
                localStorage.setItem('vah_jwt', token);
                if (data.data?.user) {
                    localStorage.setItem('vah_user', JSON.stringify(data.data.user));
                }

                // Set cookie for middleware (must match middleware cookie name: vah_session)
                document.cookie = `vah_session=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure=${location.protocol === 'https:'}`;
            }

            // Redirect to dashboard
            const user = data.data?.user || data.user;
            const isAdmin = user?.is_admin || user?.role === 'admin';
            window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard';

        } catch (err: any) {
            console.error('Login error:', err);
            setError('Failed to connect to server. Please try again.');
            setShowResetHint(false);
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted">
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-10">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 bg-background/90 backdrop-blur-md border-border hover:bg-accent hover:border-primary/20 text-foreground shadow-sm hover:shadow-md transition-all duration-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md">
                    <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-primary mb-2">Welcome Back</h1>
                            <p className="text-muted-foreground">Sign in to your account</p>
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

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 text-base font-semibold"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>

                        {/* Footer Links */}
                        <div className="mt-6 text-center space-y-2">
                            <button
                                type="button"
                                onClick={() => router.push('/signup')}
                                className="text-sm text-primary hover:underline"
                            >
                                Don't have an account? Sign up
                            </button>
                            <br />
                            <button
                                type="button"
                                onClick={() => router.push('/reset-password')}
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
