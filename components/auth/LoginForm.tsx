'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

export function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login, isLoading, error } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data.email, data.password);
            router.push('/dashboard');
        } catch (error) {
            // Error is handled by the auth context
            console.error('Login failed:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center space-x-2 mb-2">
                        <Mail className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-bold">VirtualAddressHub</h1>
                    </div>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your dashboard
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                {...register('email')}
                                className={cn(
                                    errors.email && 'border-destructive focus-visible:ring-destructive'
                                )}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    {...register('password')}
                                    className={cn(
                                        'pr-10',
                                        errors.password && 'border-destructive focus-visible:ring-destructive'
                                    )}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting || isLoading}
                        >
                            {isSubmitting || isLoading ? (
                                <LoadingSpinner size="sm" text="Signing in..." />
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        <div className="text-center space-y-2">
                            <Button
                                type="button"
                                variant="link"
                                className="p-0 h-auto text-sm"
                                onClick={() => router.push('/reset-password')}
                            >
                                Forgot your password?
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-sm"
                                    onClick={() => router.push('/signup')}
                                >
                                    Sign up
                                </Button>
                            </p>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
