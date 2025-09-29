'use client';

import { ForgotPasswordPage } from '@/components/ForgotPasswordPage';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);
  }, [searchParams]);

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'login':
        router.push('/login');
        break;
      case 'signup':
        router.push('/signup');
        break;
      case 'contact':
        router.push('/contact');
        break;
      default:
        console.log('Navigate to:', page);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => router.push('/reset-password')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <ForgotPasswordPage
      onNavigate={handleNavigate}
      onGoBack={handleGoBack}
      step="reset"
      token={token}
    />
  );
}
