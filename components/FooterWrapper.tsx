"use client";

import { Footer } from './Footer';

export function FooterWrapper() {
    const handleNavigate = (page: string, data?: any) => {
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
            case 'blog-post':
                // Handle blog post navigation with slug
                if (data?.slug) {
                    window.location.href = `/blog/${data.slug}`;
                } else {
                    window.location.href = '/blog';
                }
                break;
            default:
                // Fallback for any other pages
                window.location.href = `/${page}`;
        }
    };

    return <Footer onNavigate={handleNavigate} />;
}
