"use client";

import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, ArrowLeft, Shield, Lock, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { apiClient, authManager, logAuthEvent, logAdminAction } from "../../lib";

interface AdminLoginProps {
    onLogin: () => void;
    onGoBack?: () => void;
}

export function AdminLogin({ onLogin, onGoBack }: AdminLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTime, setLockoutTime] = useState(0);

    // Check for existing lockout on component mount
    useEffect(() => {
        const lockoutData = localStorage.getItem('admin_lockout');
        if (lockoutData) {
            const { attempts, timestamp } = JSON.parse(lockoutData);
            const now = Date.now();
            const lockoutDuration = 15 * 60 * 1000; // 15 minutes

            if (now - timestamp < lockoutDuration) {
                setLoginAttempts(attempts);
                setIsLocked(true);
                setLockoutTime(Math.ceil((lockoutDuration - (now - timestamp)) / 1000));
            } else {
                localStorage.removeItem('admin_lockout');
            }
        }
    }, []);

    // Countdown timer for lockout
    useEffect(() => {
        if (isLocked && lockoutTime > 0) {
            const timer = setTimeout(() => {
                setLockoutTime(lockoutTime - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (isLocked && lockoutTime === 0) {
            setIsLocked(false);
            setLoginAttempts(0);
            localStorage.removeItem('admin_lockout');
        }
    }, [isLocked, lockoutTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        if (isLocked) {
            setError(`Account temporarily locked. Please wait ${lockoutTime} seconds before trying again.`);
            return;
        }

        setIsLoading(true);

        try {
            await logAuthEvent('admin_login_attempt', { email });

            const response = await apiClient.post('/api/auth/login', {
                email,
                password,
                isAdmin: true
            });

            if (response.ok && response.user?.is_admin) {
                // Set authentication tokens
                authManager.setToken(response.token);
                authManager.setUser(response.user);

                await logAuthEvent('admin_login_success', {
                    email,
                    adminId: response.user.id
                });

                await logAdminAction('admin_login', {
                    email,
                    adminId: response.user.id,
                    loginTime: new Date().toISOString()
                });

                // Clear any lockout data
                localStorage.removeItem('admin_lockout');
                setLoginAttempts(0);

                setSuccess('Login successful! Redirecting...');

                // Small delay to show success message
                setTimeout(() => {
                    onLogin();
                }, 1000);
            } else {
                throw new Error('Admin access required');
            }
        } catch (error: any) {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);

            await logAuthEvent('admin_login_failed', {
                email,
                error: error.message,
                attempts: newAttempts
            });

            if (newAttempts >= 5) {
                setIsLocked(true);
                setLockoutTime(15 * 60); // 15 minutes
                localStorage.setItem('admin_lockout', JSON.stringify({
                    attempts: newAttempts,
                    timestamp: Date.now()
                }));
                setError('Too many failed attempts. Account locked for 15 minutes.');
            } else {
                const message = error.message || 'Invalid admin credentials';
                setError(`${message} (${5 - newAttempts} attempts remaining)`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!resetEmail) {
            setError('Please enter your admin email address');
            return;
        }

        setIsResetting(true);

        try {
            await logAuthEvent('admin_password_reset_request', { email: resetEmail });

            await apiClient.post('/api/admin/password-reset', {
                email: resetEmail
            });

            await logAdminAction('admin_password_reset_request', { email: resetEmail });

            setSuccess('Password reset link sent to your email');
            setShowPasswordReset(false);
            setResetEmail('');
        } catch (error: any) {
            await logAuthEvent('admin_password_reset_failed', {
                email: resetEmail,
                error: error.message
            });
            setError(error.message || 'Failed to send password reset link');
        } finally {
            setIsResetting(false);
        }
    };

    const handleDemoLogin = async () => {
        setIsLoading(true);
        setError('');

        try {
            await logAuthEvent('admin_demo_login');

            // Create demo admin session
            const demoUser = {
                id: 'demo-admin',
                email: 'admin@virtualaddresshub.co.uk',
                name: 'Demo Admin',
                is_admin: true,
                role: 'super_admin'
            };

            authManager.setUser(demoUser);
            authManager.setToken('demo-admin-token');

            await logAdminAction('admin_demo_login', {
                demoUser: demoUser.email,
                loginTime: new Date().toISOString()
            });

            setSuccess('Demo admin session created! Redirecting...');

            setTimeout(() => {
                onLogin();
            }, 1000);
        } catch (error: any) {
            setError('Failed to create demo session');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <Shield className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-semibold">Admin Portal</h1>
                    </div>
                    <h2 className="text-xl font-medium mb-2">Administrator Access</h2>
                    <p className="text-muted-foreground">Sign in to access the admin dashboard</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Admin Sign In
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert className="mb-4" variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="mb-4">
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>{success}</AlertDescription>
                            </Alert>
                        )}

                        {isLocked && (
                            <Alert className="mb-4" variant="destructive">
                                <Lock className="h-4 w-4" />
                                <AlertDescription>
                                    Account locked due to too many failed attempts.
                                    Please wait {formatTime(lockoutTime)} before trying again.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!showPasswordReset ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Admin Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@virtualaddresshub.co.uk"
                                        disabled={isLocked}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pr-10"
                                            disabled={isLocked}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                            disabled={isLocked}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        onClick={() => setShowPasswordReset(true)}
                                        disabled={isLocked}
                                    >
                                        Forgot password?
                                    </Button>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading || isLocked}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        "Access Admin Panel"
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="resetEmail">Admin Email</Label>
                                    <Input
                                        id="resetEmail"
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="admin@virtualaddresshub.co.uk"
                                        required
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isResetting}
                                    >
                                        {isResetting ? (
                                            <>
                                                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Send Reset Link"
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowPasswordReset(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-6 text-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onGoBack || (() => window.history.back())}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to website
                    </Button>
                </div>

                {/* Demo Login Section */}
                <div className="mt-6 p-4 bg-card rounded-lg border">
                    <div className="text-center mb-4">
                        <h3 className="text-sm font-medium mb-2">Demo Access</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Use demo credentials for testing purposes
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                    Creating Demo Session...
                                </>
                            ) : (
                                "Login as Demo Admin"
                            )}
                        </Button>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Demo admin credentials:</p>
                        <p className="text-xs font-mono">Email: admin@virtualaddresshub.co.uk</p>
                        <p className="text-xs font-mono">Password: admin123</p>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-xs text-yellow-800">
                            <p className="font-medium">Security Notice</p>
                            <p>Admin access is logged and monitored. Unauthorized access attempts will be reported.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
