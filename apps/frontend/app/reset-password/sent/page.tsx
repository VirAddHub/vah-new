'use client';

// Force dynamic rendering (this page passes function props)
export const dynamic = 'force-dynamic';

import { ForgotPasswordPage } from '@/components/ForgotPasswordPage';
import { useRouter } from 'next/navigation';

export default function ResetPasswordSentPage() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'login':
        router.push('/login');
        break;
      case 'signup':
        router.push('/signup');
        break;
      case 'reset-password':
        router.push('/reset-password');
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

  return (
    <ForgotPasswordPage
      onNavigate={handleNavigate}
      onGoBack={handleGoBack}
      step="sent"
    />
  );
}
