'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpPage } from '@/components/HelpPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Help() {
    const router = useRouter();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const handleNavigate = (page: string) => {
        // Scroll to top before navigation
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        
        // Handle navigation based on page
        switch (page) {
            case 'home':
                router.push('/');
                break;
            case 'pricing':
                router.push('/pricing');
                break;
            case 'blog':
                router.push('/blog');
                break;
            case 'signup':
                router.push('/signup');
                break;
            case 'login':
                router.push('/login');
                break;
            case 'help':
                router.push('/help');
                break;
            case 'contact':
                router.push('/contact');
                break;
            case 'privacy':
                router.push('/privacy');
                break;
            case 'terms':
                router.push('/terms');
                break;
            case 'compliance-check':
                router.push('/compliance-check');
                break;
            default:
                router.push(`/${page}`);
        }
    };

    const handleGoBack = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.history.back();
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header onNavigate={handleNavigate} />
            <main className="flex-1">
                <HelpPage onNavigate={handleNavigate} onGoBack={handleGoBack} />
            </main>
            <Footer onNavigate={handleNavigate} />
        </div>
    );
}
