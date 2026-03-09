import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/server/session';
import { LoginPageClient } from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Login | VirtualAddressHub',
  description: 'Sign in to your VirtualAddressHub account.',
};

// Always evaluate auth on the server for this page
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getSessionFromCookies();

  if (session.authenticated) {
    // Mail inbox is the primary dashboard surface
    redirect('/mail');
  }

  return <LoginPageClient />;
}

