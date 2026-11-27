'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, User } from 'lucide-react';
import { devError } from '@/lib/devConsole';

type PageStatus =
  | 'loading'
  | 'invalid_token'
  | 'expired_token'
  | 'token_used'
  | 'already_verified'
  | 'ready_to_start'
  | 'pending'
  | 'verified'
  | 'rejected';

interface OwnerContext {
  id: number;
  fullName: string;
  email: string;
  status: string;
}

function VerifyOwnerContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const [owner, setOwner] = useState<OwnerContext | null>(null);
  const [startLoading, setStartLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid_token');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    let cancelled = false;
    const verifyToken = async () => {
      try {
        const response = await fetch(
          `/api/bff/business-owners/verify?token=${encodeURIComponent(token)}`,
          { method: 'GET', cache: 'no-store' }
        );
        const result = await response.json();

        if (cancelled) return;

        if (!result.ok || !result.data) {
          setStatus('invalid_token');
          setMessage(result.data?.message || 'This verification link is invalid or has expired.');
          return;
        }

        const data = result.data;
        if (data.tokenExpired) {
          setStatus('expired_token');
          setMessage(
            data.message ||
              'This verification link has expired. Please contact the account holder to request a new link.'
          );
          return;
        }

        if (data.valid && data.owner) {
          const ownerData = data.owner as OwnerContext;
          setOwner(ownerData);
          if (ownerData.status === 'verified' || data.alreadyVerified) {
            setStatus('already_verified');
            setMessage('You have already completed identity verification.');
            return;
          }
          if (ownerData.status === 'rejected') {
            setStatus('rejected');
            setMessage(
              'Your previous verification was not approved. Please contact the account holder to request a new verification link.'
            );
            return;
          }
          if (data.canStart) {
            setStatus('ready_to_start');
            setMessage('');
            return;
          }
          if (data.tokenUsed) {
            setStatus('token_used');
            setMessage(
              'This verification link has already been used. If you have not yet completed verification, ask the account holder to send you a new verification email.'
            );
            return;
          }
          setStatus('pending');
          setMessage(
            'Verification has been started. Status will update once our team has reviewed your documents.'
          );
          return;
        }

        setStatus('invalid_token');
        setMessage(data?.message || 'This verification link is invalid or has expired.');
      } catch (error) {
        if (cancelled) return;
        devError('[VerifyOwner] Error:', error);
        setStatus('invalid_token');
        setMessage('Failed to verify link. Please try again.');
      }
    };

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleStartVerification = async () => {
    if (!token || status !== 'ready_to_start') return;
    setStartLoading(true);
    try {
      const response = await fetch('/api/bff/business-owners/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      });
      const result = await response.json();

      if (result.ok && result.data?.auto_approved) {
        setStatus('already_verified');
        setMessage('');
      } else if (response.status === 503) {
        // No identity provider is connected yet: we contact the person directly.
        setMessage(result.message || 'Online identity verification is not available yet. We will contact you to complete it.');
      } else {
        setMessage(result.message || result.data?.message || 'Failed to start verification. Please try again.');
      }
    } catch (error) {
      devError('[VerifyOwner] Start error:', error);
      setMessage('Failed to start verification. Please try again.');
    } finally {
      setStartLoading(false);
    }
  };

  const showStartButton = status === 'ready_to_start';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {(status === 'ready_to_start' || status === 'pending') && (
              <User className="h-12 w-12 text-primary" />
            )}
            {(status === 'already_verified' || status === 'verified') && (
              <CheckCircle2 className="h-12 w-12 text-success" />
            )}
            {(status === 'invalid_token' || status === 'expired_token' || status === 'token_used' || status === 'rejected') && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying link'}
            {status === 'invalid_token' && 'Invalid link'}
            {status === 'expired_token' && 'Link expired'}
            {status === 'token_used' && 'Link already used'}
            {status === 'already_verified' && 'Already verified'}
            {status === 'ready_to_start' && 'Identity verification'}
            {status === 'pending' && 'Identity verification'}
            {status === 'verified' && 'Verification complete'}
            {status === 'rejected' && 'Verification not approved'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your link…'}
            {status === 'invalid_token' && 'We couldn’t verify your link.'}
            {status === 'expired_token' && 'This link is no longer valid.'}
            {status === 'token_used' && 'This verification link has already been used.'}
            {status === 'already_verified' && 'You have already completed verification.'}
            {status === 'ready_to_start' &&
              owner &&
              `Hello ${owner.fullName}, please start your identity verification below.`}
            {status === 'pending' &&
              'Verification has been started. Status will update once our team has reviewed your documents.'}
            {status === 'verified' && 'Your identity has been verified.'}
            {status === 'rejected' && 'Your previous verification was not approved.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <p className="text-body-sm text-muted-foreground text-center">{message}</p>
          )}

          {status === 'ready_to_start' && (
            <Alert>
              <AlertDescription>
                You need to complete identity verification to help verify the business account.
                This process is secure and only requires identity documents (no address proof
                needed).
              </AlertDescription>
            </Alert>
          )}

          {showStartButton && (
            <Button
              onClick={handleStartVerification}
              disabled={startLoading}
              className="w-full"
            >
              {startLoading ? 'Starting…' : 'Start verification'}
            </Button>
          )}

          {status === 'already_verified' && (
            <Alert className="bg-success/[0.06] dark:bg-green-900/20 border-success/25 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-success dark:text-green-400" />
              <AlertDescription className="text-success dark:text-green-200">
                No further action is needed. You can close this page.
              </AlertDescription>
            </Alert>
          )}

          {(status === 'invalid_token' || status === 'expired_token') && (
            <Alert className="bg-destructive/10 border-destructive/20">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                {status === 'expired_token'
                  ? 'Links are valid for 7 days. Please contact the account holder to request a new verification link.'
                  : 'This link may be invalid or have already been used. Please contact the account holder to request a new verification link.'}
              </AlertDescription>
            </Alert>
          )}

          {status === 'token_used' && (
            <Alert className="bg-mist dark:bg-amber-900/20 border-line dark:border-amber-800">
              <AlertDescription className="text-ink dark:text-amber-200">
                If you have not yet completed verification, ask the account holder to send you a new
                verification email from their Account → Verification page.
              </AlertDescription>
            </Alert>
          )}

          {status === 'rejected' && (
            <Alert className="bg-destructive/10 border-destructive/20">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                The account holder can send you a new verification link from their Account →
                Verification page. You will need to complete verification again with a new link.
              </AlertDescription>
            </Alert>
          )}

          {status === 'pending' && (
            <Alert>
              <AlertDescription>
                Verification has been started. Status will update once our team has reviewed your
                documents. If you did not complete the form, please use the same link from your
                email to try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOwnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <CardTitle>Loading…</CardTitle>
              <CardDescription>
                Please wait while we load the verification page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyOwnerContent />
    </Suspense>
  );
}
