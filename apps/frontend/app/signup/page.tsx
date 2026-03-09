import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { SignupPageClient } from './SignupPageClient';
import { getSessionFromCookies } from '@/lib/server/session';

export const metadata: Metadata = {
    title: 'Sign Up | VirtualAddressHub',
    description: 'Create your VirtualAddressHub account and get a professional London business address. Start your free trial today.',
    openGraph: {
        title: 'Sign Up | VirtualAddressHub',
        description: 'Create your VirtualAddressHub account and get a professional London business address.',
        url: 'https://virtualaddresshub.com/signup',
    },
};

export const dynamic = 'force-dynamic';

export default async function Signup() {
    const session = await getSessionFromCookies();

    if (session.authenticated) {
        // Authenticated users should not meaningfully see the signup page
        redirect('/mail');
    }

    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                <SignupPageClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
