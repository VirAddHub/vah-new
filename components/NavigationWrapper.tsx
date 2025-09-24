"use client";

import { Navigation } from './Navigation';
import { Footer } from './Footer';

export function NavigationWrapper() {
    const handleNavigate = (page: string) => {
        // Simple navigation handler - you can enhance this later with Next.js router
        if (page === 'home') {
            window.location.href = '/';
        } else {
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
