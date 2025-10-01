"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Call backend login endpoint
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setError(data.message || 'Invalid email or password');
                setLoading(false);
                return;
            }

            // Store token in localStorage and cookie
            const token = data.data.token;
            localStorage.setItem('vah_jwt', token);
            localStorage.setItem('vah_user', JSON.stringify(data.data.user));

            // Set cookie for middleware
            document.cookie = `vah_jwt=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure=${location.protocol === 'https:'}`;

            // Redirect to dashboard
            const isAdmin = data.data.user.is_admin || data.data.user.role === 'admin';
            window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard';

        } catch (err: any) {
            console.error('Login error:', err);
            setError('Failed to connect to server');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
                        <p className="text-muted-foreground">Sign in to your account</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert className="mb-6 border-destructive/50 text-destructive">
                            <AlertDescription>{error}</AlertDescription>
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
                            onClick={() => router.push('/signup')}
                            className="text-sm text-primary hover:underline"
                        >
                            Don't have an account? Sign up
                        </button>
                        <br />
                        <button
                            onClick={() => router.push('/forgot-password')}
                            className="text-sm text-primary hover:underline"
                        >
                            Forgot your password?
                        </button>
                        <br />
                        <button
                            onClick={() => router.push('/')}
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            ← Back to home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
