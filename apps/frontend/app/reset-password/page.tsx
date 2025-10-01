'use client';

export const dynamic = 'force-dynamic';

import { ForgotPasswordPage } from '@/components/ForgotPasswordPage';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'login':
        router.push('/login');
        break;
      case 'signup':
        router.push('/signup');
        break;
      case 'reset-password-sent':
        router.push('/reset-password/sent');
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
      step="email"
    />
  );
}
