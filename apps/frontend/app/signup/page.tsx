import type { Metadata } from 'next';
import { SignupPage } from '../../components/SignupPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { SignupPageClient } from './SignupPageClient';

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

export default function Signup() {
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
