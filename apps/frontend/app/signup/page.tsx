"use client";

export const dynamic = 'force-dynamic';

import { SignupPage } from '../../components/SignupPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export default function Signup() {
    const handleNavigate = (page: string) => {
        if (page === 'home') {
            window.location.href = '/';
        }
    };

    // Add debugging for deployment issues
    console.log('Signup page loaded successfully - Force deployment trigger v2');

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <SignupPage onNavigate={handleNavigate} />
            </main>
            <Footer />
        </div>
    );
}
