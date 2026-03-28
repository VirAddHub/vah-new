'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

/**
 * Login header brand — not VAHLogo: explicit box + eager img + text fallback
 * so the mark stays visible even if flex/SVG sizing misbehaves or the asset 404s.
 */
function LoginBrandMark() {
  const [useTextFallback, setUseTextFallback] = useState(false);

  if (useTextFallback) {
    return (
      <Link
        href="/"
        className="inline-flex min-h-[36px] min-w-0 shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label="VirtualAddressHub home"
      >
        <span className="text-body font-semibold tracking-tight text-foreground sm:text-body-lg">
          Virtual<span className="text-primary">Address</span>Hub
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className="inline-flex h-9 min-h-[36px] w-auto max-w-[200px] shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10 sm:max-w-[220px]"
      aria-label="VirtualAddressHub home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- public SVG; avoids optimizer quirks */}
      <img
        src="/images/logo.svg"
        alt=""
        width={160}
        height={40}
        className="block h-8 w-auto max-w-[200px] object-contain object-left sm:h-9 sm:max-w-[220px]"
        loading="eager"
        decoding="sync"
        onError={() => setUseTextFallback(true)}
      />
    </Link>
  );
}

// Map backend error codes to user-friendly messages
function getLoginErrorMessage(
  backendError: string | undefined
): { message: string; showResetHint: boolean } {
  if (!backendError) {
    return {
      message: 'The email or password you entered is incorrect.',
      showResetHint: true,
    };
  }

  const errorLower = backendError.toLowerCase().trim();

  // Map technical error codes to friendly messages
  if (
    errorLower === 'invalid_credentials' ||
    errorLower.includes('invalid') ||
    errorLower.includes('credentials')
  ) {
    return {
      message: 'The email or password you entered is incorrect.',
      showResetHint: true,
    };
  }

  if (
    errorLower.includes('not found') ||
    errorLower.includes('user not found')
  ) {
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
    message:
      "We couldn't sign you in. Please check your details or reset your password.",
    showResetHint: true,
  };
}

export function LoginPageClient() {
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

  // Client-side auth guard + bfcache handling
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/bff/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const authenticated =
          data?.authenticated === true ||
          data?.data?.authenticated === true;
        if (!cancelled && authenticated) {
          // Mail is the primary dashboard view (middleware also redirects /dashboard -> /mail)
          router.replace('/mail');
        }
      } catch {
        // Ignore errors - server-side guard is the source of truth
      }
    };

    checkAuth();

    const handlePageShow = (event: any) => {
      if (event?.persisted) {
        checkAuth();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [router]);

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
      if (isAdmin) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/mail');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Failed to connect to server. Please try again.');
      setShowResetHint(false);
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex flex-col flex-1">
        {/* Header: brand only */}
        <div className="flex w-full items-center px-0.5 pt-5 sm:pt-7 pb-2 sm:pb-3 z-10">
          <LoginBrandMark />
        </div>

        {/* Main area - balanced height */}
        <div className="flex items-center justify-center flex-1 min-h-[calc(100vh-120px)] py-8 sm:py-12">
          <div className="w-full max-w-[480px]">
            {/* Heading + subtitle outside the card (product-style auth layout) */}
            <div className="mb-5 text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-1.5 text-body-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <div className="rounded-[14px] border border-border bg-card p-6 shadow-sm sm:p-8">
              {/* Success Alert - Email Changed */}
              {emailChanged && (
                <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Your email address has been updated successfully. Please log
                    in with your new email address.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert className="mb-6 border-destructive/50 text-destructive">
                  <AlertDescription className="space-y-2">
                    <div className="font-medium">{error}</div>
                    {showResetHint && (
                      <div className="mt-2 text-body-sm text-muted-foreground">
                        Use <span className="font-medium text-foreground">Forgot password?</span> next to Password to reset it.
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 w-full border-border bg-muted/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className="text-foreground">
                      Password
                    </Label>
                    <Link
                      href="/reset-password"
                      className="shrink-0 text-body-sm font-medium text-primary transition-colors hover:text-primary/90"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 w-full border-border bg-muted/60"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full text-body font-semibold bg-primary text-primary-foreground transition-[filter,background] hover:bg-primary/90 hover:brightness-95"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 space-y-3 border-t border-border pt-4 text-left">
                <div>
                  <span className="text-body-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                  </span>
                  <Link
                    href="/signup"
                    className="text-body-sm font-medium text-primary hover:underline"
                  >
                    Sign up free
                  </Link>
                </div>
                <div>
                  <Link
                    href="/contact"
                    className="text-body-sm font-medium text-primary transition-colors hover:text-primary/90 hover:underline"
                  >
                    Can&apos;t log in?
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Terms & Privacy */}
        <footer className="py-4 flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <Link
            href="/terms"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <Link
            href="/privacy"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
        </footer>
      </div>
    </div>
  );
}

