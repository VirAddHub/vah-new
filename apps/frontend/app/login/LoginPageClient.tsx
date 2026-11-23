'use client';

import { VAHLogo } from '@/components/VAHLogo';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mutate } from 'swr';
import { DASHBOARD_BOOTSTRAP_KEY } from '@/lib/swrKeys';
import { isAdminRole } from '@/lib/verifiedAdminSession';

type LoginBrandVariant = 'default' | 'onDark';

/**
 * Login uses the same green brand assets and fallback as every frontend header
 * so the mark stays visible even if flex/SVG sizing misbehaves or the asset 404s.
 */
function LoginBrandMark({ variant = 'default' }: { variant?: LoginBrandVariant }) {
  return <VAHLogo variant={variant} size="md" className="shrink-0" />;
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
  if (errorLower === 'account_suspended') {
    return { message: 'This account has been suspended. Please contact support.', showResetHint: false };
  }
  if (errorLower === 'too_many_attempts' || errorLower.includes('too many')) {
    return { message: 'Too many sign-in attempts from this device. Please wait a few minutes, or reset your password to sign in straight away.', showResetHint: true };
  }
  if (errorLower === 'account_closed') {
    return { message: 'This account has been closed. Please contact support if you think this is a mistake.', showResetHint: false };
  }
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
        // whoami returns { ok: true, data: { user: { id, is_admin, role, ... } } }
        const authenticated = data?.ok === true && data?.data?.user != null;
        if (!cancelled && authenticated) {
          const user = data.data.user;
          const isAdmin = user?.is_admin === true || isAdminRole(user?.role);
          router.replace(isAdmin ? '/admin/dashboard' : '/mail');
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

    // Client-side email format validation — avoids a round-trip and prevents
    // an HTML error-page response from the BFF crashing the JSON parse below.
    const emailTrimmed = email.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTrimmed);
    if (!emailValid) {
      setError('Please enter a valid email address.');
      setShowResetHint(false);
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
        body: JSON.stringify({ email: emailTrimmed, password }),
      });

      // Safe parse — BFF may return an HTML error page on unexpected failures
      const responseText = await response.text();
      let data: any = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = {}; }

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
        // Token handled by HttpOnly cookie
      }

      const user = data.data?.user || data.user;
      if (user) {
        // User object handled by API
      }

      // Drop any in-memory SWR for the previous session before confirming the new one
      try {
        await mutate(DASHBOARD_BOOTSTRAP_KEY, undefined, { revalidate: false });
      } catch {
        /* non-fatal */
      }

      const whoRes = await fetch('/api/bff/auth/whoami', {
        credentials: 'include',
        cache: 'no-store',
      });
      const whoJson = await whoRes.json().catch(() => ({}));
      const whoOk =
        whoRes.ok &&
        whoJson?.ok === true &&
        (whoJson?.data?.user?.id != null || whoJson?.data?.user != null);

      if (!whoOk) {
        setError('Could not confirm your session. Please try signing in again.');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const bootRes = await fetch('/api/bff/dashboard/bootstrap', {
        credentials: 'include',
        cache: 'no-store',
      });
      const bootJson = await bootRes.json().catch(() => ({}));
      if (!bootRes.ok || bootJson?.ok !== true) {
        setError('Could not load your account. Please try again.');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      try {
        await mutate(DASHBOARD_BOOTSTRAP_KEY, bootJson, { revalidate: false });
      } catch {
        /* non-fatal */
      }

      if (process.env.NEXT_PUBLIC_DASHBOARD_BOOTSTRAP_DEBUG === '1') {
        // eslint-disable-next-line no-console
        console.info('[login] whoami + bootstrap confirmed', {
          t: Date.now(),
          fetchedAt: bootJson?.data?.fetchedAt,
        });
      }

      setLoading(false);
      isSubmittingRef.current = false;

      // Redirect to mail inbox (or admin dashboard for admins)
      // M-3: Validate the ?next= redirect target to prevent open redirect attacks.
      // Only allow relative paths that start with '/' and don't begin with '//'.
      const rawNext = searchParams.get('next') ?? '';
      function isSafeNextUrl(url: string): boolean {
        if (!url || !url.startsWith('/') || url.startsWith('//')) return false;
        try {
          // Reject any value that parses as an absolute URL (has a scheme)
          const parsed = new URL(url, 'https://placeholder.invalid');
          return parsed.host === 'placeholder.invalid';
        } catch {
          return false;
        }
      }
      const safeNext = isSafeNextUrl(rawNext) ? rawNext : null;

      const isAdmin = user?.is_admin || isAdminRole(user?.role);
      if (safeNext) {
        router.replace(safeNext);
      } else if (isAdmin) {
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
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6 sm:px-10">
        <LoginBrandMark />
      </header>

      <main id="main-content" className="flex flex-1 items-start justify-center px-6 pb-16 pt-8 sm:items-center sm:pt-0">
        <form onSubmit={handleSubmit} noValidate={false} className="w-full max-w-[400px]" aria-describedby={error ? 'login-error' : undefined}>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.045em]">Log in</h1>
          <p className="mt-3 text-[16px] text-graphite">Pick up where you left off in your mailbox.</p>

          {emailChanged && (
            <p role="status" className="mt-8 rounded-md border border-success/25 bg-success/[0.06] px-4 py-3 text-[14px] text-success">
              Your email address has been updated. Please log in with your new address.
            </p>
          )}

          {error && (
            <div id="login-error" role="alert" className="mt-8 rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-[14px] text-destructive">
              <p className="font-medium">{error}</p>
              {showResetHint && (
                <p className="mt-1 text-graphite">
                  Forgotten it? <Link href="/reset-password" className="font-medium text-ink underline underline-offset-4">Reset your password</Link>.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@yourbusiness.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/reset-password" className="text-[14px] text-graphite underline-offset-4 hover:text-ink hover:underline">
                  Forgot it?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth loading={loading} className="mt-8">
            {loading ? 'Signing in…' : 'Log in'}
          </Button>

          <p className="mt-8 text-center text-[14px] text-graphite">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Start one</Link>
          </p>
        </form>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-6 py-6 text-[12px] text-slate sm:px-10">
        <span>© {new Date().getFullYear()} VirtualAddressHub Ltd</span>
        <span>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span aria-hidden> · </span>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </span>
      </footer>
    </div>
  );
}

