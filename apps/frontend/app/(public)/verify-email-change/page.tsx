'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { clearToken } from '@/lib/token-manager';

function VerifyEmailChangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);

    // Safety check: If token missing, show invalid link state
    if (!tokenParam) {
      setStatus('invalid');
      setMessage('This confirmation link is invalid. Please check your email and try again.');
      return;
    }

    // Call the BFF confirmation endpoint
    const confirmEmailChange = async () => {
      try {
        const response = await fetch(`/api/bff/profile/confirm-email-change?token=${encodeURIComponent(tokenParam)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (result.ok && result.data?.changed === true) {
          setStatus('success');
          setMessage('Your email address has been updated successfully.');
          
          // Logout the user (clear all auth tokens and cookies)
          clearToken();
          
          // Clear any stored user data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            // Clear session cookie
            document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } else {
          // Backend returns changed: false for invalid/expired/already used tokens
          // We can't distinguish between these cases without additional API calls
          setStatus('error');
          setMessage(result.data?.message || 'This confirmation link is invalid or has expired.');
        }
      } catch (error) {
        console.error('[VerifyEmailChange] Error:', error);
        setStatus('error');
        setMessage('This confirmation link is invalid or has expired.');
      }
    };

    confirmEmailChange();
  }, [searchParams]);

  const handleResend = async () => {
    if (!token || resending || resendSent) return;

    setResending(true);
    try {
      const response = await fetch('/api/bff/profile/email-change/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      });

      const result = await response.json();

      if (result.ok) {
        setResendSent(true);
      } else {
        // Still show success to user (no enumeration)
        setResendSent(true);
      }
    } catch (error) {
      console.error('[VerifyEmailChange] Resend error:', error);
      // Still show success to user (no enumeration)
      setResendSent(true);
    } finally {
      setResending(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/overview');
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {(status === 'error' || status === 'invalid') && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Confirming Email Change'}
            {status === 'success' && 'Email Updated Successfully'}
            {(status === 'error' || status === 'invalid') && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email address has been updated.'}
            {(status === 'error' || status === 'invalid') && 'We couldn\'t verify your email change.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {message}
          </p>

          {status === 'success' && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your email address has been updated. You have been logged out for security. Please log in with your new email address.
                </p>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'invalid') && (
            <div className="space-y-3">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  {status === 'invalid' 
                    ? 'This link is invalid. Please check your email and use the link provided.'
                    : 'This link may have expired (links are valid for 30 minutes) or has already been used.'}
                </p>
              </div>
              
              {resendSent ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Sent — check your inbox.
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    If you still can't find it, reply to this email.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleResend}
                  disabled={resending || !token}
                  className="w-full"
                  variant="outline"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend confirmation email
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                This may take a few seconds...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}
