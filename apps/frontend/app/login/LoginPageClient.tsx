'use client';

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
 * Login header brand — not VAHLogo: explicit box + eager img + text fallback
 * so the mark stays visible even if flex/SVG sizing misbehaves or the asset 404s.
 */
function LoginBrandMark({ variant = 'default' }: { variant?: LoginBrandVariant }) {
  const [useTextFallback, setUseTextFallback] = useState(false);
  const onDark = variant === 'onDark';

  if (useTextFallback) {
    return (
      <Link
        href="/"
        className={cn(
          'inline-flex min-h-[36px] min-w-0 shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2',
          onDark
            ? 'focus-visible:ring-white/35'
            : 'focus-visible:ring-primary/30'
        )}
        aria-label="VirtualAddressHub home"
      >
        <span
          className={cn(
            'text-body font-semibold tracking-tight sm:text-body-lg',
            onDark ? 'text-white' : 'text-foreground'
          )}
        >
          Virtual
          <span className={onDark ? 'text-emerald-200' : 'text-primary'}>Address</span>
          Hub
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex h-9 min-h-[36px] w-auto max-w-[200px] shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 sm:h-10 sm:max-w-[220px]',
        onDark ? 'focus-visible:ring-white/35' : 'focus-visible:ring-primary/30'
      )}
      aria-label="VirtualAddressHub home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- public SVG; avoids optimizer quirks */}
      <img
        src="/images/logo.svg"
        alt=""
        width={160}
        height={40}
        className={cn(
          'block h-8 w-auto max-w-[200px] object-contain object-left sm:h-9 sm:max-w-[220px]',
          onDark && 'brightness-0 invert opacity-95'
        )}
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

  // ── Design tokens (handoff) ──────────────────────────────────
  const T = {
    paper:      '#F2EBDD',
    paperDeep:  '#E8E0CE',
    paperLight: '#FBF6E9',
    ink:        '#1F1A14',
    ink2:       '#3D362C',
    muted:      '#7A6F5E',
    rule:       '#D7CDB6',
    green:      '#1F4934',
    stamp:      '#B9352A',
    font:       "'Poppins', system-ui, sans-serif",
  } as const;

  return (
    <div style={{
      background: T.paper,
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      fontFamily: T.font,
    }}>

      {/* ── Left column: logo + form + compliance ── */}
      <div style={{
        padding: 'clamp(28px, 4vw, 40px) clamp(24px, 5vw, 56px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>

        {/* Logo */}
        <LoginBrandMark />

        {/* Form — centred vertically */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <form
            onSubmit={handleSubmit}
            style={{ width: '100%', maxWidth: 420 }}
          >
            {/* Heading */}
            <h1 style={{
              fontFamily: T.font, fontSize: 'clamp(2.75rem, 6vw, 3.5rem)', color: T.ink,
              margin: '0 0 12px', letterSpacing: '-0.03em', fontWeight: 300, lineHeight: 1,
            }}>
              Log{' '}
              <span style={{ fontStyle: 'italic', color: T.green, fontWeight: 400 }}>in.</span>
            </h1>

            <p style={{
              fontFamily: T.font, fontSize: 16, color: T.ink2, fontWeight: 300,
              margin: '0 0 36px', lineHeight: 1.5,
            }}>
              Pick up where you left off in your mailbox.
            </p>

            {/* Email changed success */}
            {emailChanged && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 4, padding: '12px 16px', marginBottom: 20,
                fontFamily: T.font, fontSize: 13, color: '#166534', fontWeight: 400,
              }}>
                Your email address has been updated. Please log in with your new address.
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: 4, padding: '12px 16px', marginBottom: 20,
                fontFamily: T.font, fontSize: 13, color: '#991b1b', fontWeight: 400,
              }}>
                <div style={{ fontWeight: 500 }}>{error}</div>
                {showResetHint && (
                  <div style={{ marginTop: 6, color: T.muted }}>
                    Use <span style={{ fontWeight: 500, color: T.ink2 }}>Forgot it?</span> to reset your password.
                  </div>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label style={{
                fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 500,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 8, display: 'block',
              }}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@yourbusiness.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `1px solid ${T.rule}`, background: T.paperLight,
                  fontFamily: T.font, fontSize: 15, fontWeight: 300, color: T.ink,
                  outline: 'none', borderRadius: 0,
                  opacity: loading ? 0.6 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = T.green; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.rule; }}
              />
            </div>

            {/* Password field */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <label style={{
                  fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 500,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>Password</label>
                <Link href="/reset-password" style={{
                  fontFamily: T.font, fontSize: 13, color: T.green,
                  fontStyle: 'italic', textDecoration: 'none', fontWeight: 400,
                }}>Forgot it?</Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `1px solid ${T.rule}`, background: T.paperLight,
                  fontFamily: T.font, fontSize: 15, fontWeight: 300, color: T.ink,
                  outline: 'none', borderRadius: 0,
                  opacity: loading ? 0.6 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = T.green; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.rule; }}
              />
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 32, width: '100%',
                background: T.green, color: T.paper, padding: '16px',
                fontFamily: T.font, fontSize: 15, fontWeight: 500,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 4, minHeight: 48,
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Log in →'}
            </button>

            {/* Sign-up link */}
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <span style={{ fontFamily: T.font, fontSize: 14, color: T.ink2, fontWeight: 300 }}>
                Don&apos;t have an account yet?{' '}
                <Link href="/signup" style={{
                  color: T.green, fontStyle: 'italic', textDecoration: 'none', fontWeight: 400,
                }}>Start one →</Link>
              </span>
            </div>
          </form>
        </div>

        {/* Compliance footer */}
        <div style={{
          fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 400,
          letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span>HMRC AML · XRML00000123456</span>
          <span>ICO · ZA123456</span>
          <span>© 2026 VirtualAddressHub Ltd</span>
        </div>
      </div>

      {/* ── Right column: airmail envelope ── */}
      <div style={{
        background: T.paperDeep,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 56,
        minHeight: '100vh',
      }}>
        <div style={{
          width: '85%', maxWidth: 500, aspectRatio: '3/2',
          background: T.paperLight, position: 'relative',
          boxShadow: '0 30px 60px -20px rgba(60,40,10,0.3), 0 8px 16px -8px rgba(60,40,10,0.15)',
          transform: 'rotate(-1.5deg)',
          border: `1px solid ${T.rule}`,
        }}>
          {/* Airmail border */}
          <div style={{
            position: 'absolute', inset: 0, padding: 6,
            backgroundImage: `repeating-linear-gradient(45deg, ${T.stamp} 0 8px, transparent 8px 16px, ${T.green} 16px 24px, transparent 24px 32px)`,
            WebkitMask: 'linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          } as React.CSSProperties} />

          {/* Stamp */}
          <div style={{
            position: 'absolute', top: 22, right: 26,
            width: 76, height: 92,
            background: T.paper, padding: 5,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              width: '100%', height: '100%', background: T.stamp,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: T.paper, fontFamily: T.font, lineHeight: 1.1, textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', fontWeight: 500 }}>UK</div>
              <div style={{ fontSize: 20, fontStyle: 'italic', marginTop: 4, fontWeight: 300 }}>1st</div>
              <div style={{ fontSize: 7, marginTop: 4, fontWeight: 500, letterSpacing: '0.05em' }}>FIRST CLASS</div>
            </div>
          </div>

          {/* Postmark */}
          <div style={{
            position: 'absolute', top: 32, right: 120,
            width: 100, height: 100,
            border: `1.5px solid ${T.stamp}`, borderRadius: '50%',
            opacity: 0.45, transform: 'rotate(-12deg)',
            display: 'grid', placeItems: 'center', textAlign: 'center',
            color: T.stamp, fontFamily: T.font, fontSize: 8,
            letterSpacing: '0.08em', fontWeight: 500,
          }}>
            <div>
              <div>LONDON</div>
              <div style={{ fontSize: 13, margin: '2px 0', fontStyle: 'italic', fontWeight: 300 }}>WELCOME</div>
              <div>BACK</div>
            </div>
          </div>

          {/* Address — redacted, no real postal address before signup */}
          <div style={{
            position: 'absolute', left: 48, bottom: 48,
            fontFamily: T.font, color: T.ink, lineHeight: 1.4,
          }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontWeight: 500, letterSpacing: '0.08em' }}>To:</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Your Business, Ltd.</div>
            <div style={{ fontSize: 14, color: T.ink2, marginTop: 4, fontStyle: 'italic', fontWeight: 300 }}>
              Central London<br />
              business address
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: stack on mobile, side-by-side on lg */}
      <style>{`
        @media (max-width: 900px) {
          [style*="minHeight: '100vh'"][style*="background: '#E8E0CE'"],
          [style*='minHeight: "100vh"'][style*='background: "#E8E0CE"'] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

