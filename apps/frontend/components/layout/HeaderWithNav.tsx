'use client';

import { useRouter } from 'next/navigation';
import { Header } from './Header';

export function HeaderWithNav() {
    const router = useRouter();

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

    return <Header onNavigate={handleNavigate} />;
}

