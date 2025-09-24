"use client";

import { Navigation } from './Navigation';
import { Footer } from './Footer';

export function NavigationWrapper() {
    const handleNavigate = (page: string) => {
        // Handle navigation based on your actual page structure
        switch (page) {
            case 'home':
                window.location.href = '/';
                break;
            case 'pricing':
                window.location.href = '/pricing';
                break;
            case 'blog':
                window.location.href = '/blog';
                break;
            case 'about':
                window.location.href = '/about';
                break;
            case 'help':
                window.location.href = '/help';
                break;
            case 'dashboard':
                window.location.href = '/dashboard';
                break;
            case 'admin':
                window.location.href = '/admin';
                break;
            case 'login':
                window.location.href = '/login';
                break;
            case 'signup':
                window.location.href = '/signup';
                break;
            case 'contact':
                window.location.href = '/contact';
                break;
            case 'privacy':
                window.location.href = '/privacy';
                break;
            case 'terms':
                window.location.href = '/terms';
                break;
            case 'kyc-policy':
                window.location.href = '/kyc';
                break;
            default:
                // Fallback for any other pages
                window.location.href = `/${page}`;
        }
    };

    return (
        <>
            <Navigation onNavigate={handleNavigate} />
            <Footer onNavigate={handleNavigate} />
        </>
    );
}
