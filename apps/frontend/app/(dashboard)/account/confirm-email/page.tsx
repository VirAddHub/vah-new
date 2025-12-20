'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('This confirmation link is invalid.');
      return;
    }

    // Call the BFF confirmation endpoint
    const confirmEmailChange = async () => {
      try {
        const response = await fetch(`/api/bff/profile/confirm-email-change?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (result.ok && result.data?.changed === true) {
          setStatus('success');
          setMessage('Your email address has been confirmed.');
          
          // Redirect to account page after 3 seconds
          setTimeout(() => {
            router.push('/account');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.data?.message || 'This confirmation link is invalid or has expired.');
        }
      } catch (error) {
        console.error('[ConfirmEmail] Error:', error);
        setStatus('error');
        setMessage('This confirmation link is invalid or has expired.');
      }
    };

    confirmEmailChange();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Confirming Email Change'}
            {status === 'success' && 'Email Changed Successfully'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email address has been updated.'}
            {status === 'error' && 'We couldn\'t verify your email change.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {message}
          </p>

          {status === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                You can now log in with your new email address. Redirecting to account page...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  This link may have expired (links are valid for 30 minutes) or has already been used.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push('/account')}
                  className="w-full"
                >
                  Go to Account Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/contact')}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
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

export default function ConfirmEmailPage() {
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
      <ConfirmEmailContent />
    </Suspense>
  );
}

