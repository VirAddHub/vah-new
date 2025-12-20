'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, User } from 'lucide-react';

function VerifyOwnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/bff/business-owners/verify?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (result.ok && result.data?.valid === true) {
          setOwnerName(result.data.owner?.fullName || '');
          setStatus('verifying');
        } else {
          setStatus('error');
          setMessage(result.data?.message || 'This verification link is invalid or has expired.');
        }
      } catch (error) {
        console.error('[VerifyOwner] Error:', error);
        setStatus('error');
        setMessage('Failed to verify link. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleStartVerification = async () => {
    const token = searchParams.get('token');
    if (!token) return;

    setStatus('verifying');
    try {
      const response = await fetch('/api/bff/business-owners/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      });

      const result = await response.json();

      if (result.ok && result.data?.started === true) {
        setStatus('success');
        setMessage('Identity verification has been started. You will receive further instructions via email.');
      } else {
        setStatus('error');
        setMessage(result.data?.message || 'Failed to start verification. Please try again.');
      }
    } catch (error) {
      console.error('[VerifyOwner] Start error:', error);
      setStatus('error');
      setMessage('Failed to start verification. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'verifying' && (
              <User className="h-12 w-12 text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying Link'}
            {status === 'verifying' && 'Identity Verification'}
            {status === 'success' && 'Verification Started'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your link...'}
            {status === 'verifying' && ownerName && `Hello ${ownerName}, please start your identity verification.`}
            {status === 'success' && 'Your identity verification process has begun.'}
            {status === 'error' && 'We couldn\'t verify your link.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {message}
          </p>

          {status === 'verifying' && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  You need to complete identity verification to help verify the business account. This process is secure and only requires identity documents (no address proof needed).
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleStartVerification}
                className="w-full"
              >
                Start Identity Verification
              </Button>
            </div>
          )}

          {status === 'success' && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                You will receive an email with instructions to complete your identity verification. No further action is needed on this page.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="bg-destructive/10 border-destructive/20">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                This link may have expired (links are valid for 7 days) or has already been used. Please contact the account holder to request a new verification link.
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
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Please wait while we load the verification page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyOwnerContent />
    </Suspense>
  );
}

