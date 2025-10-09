"use client";

export const dynamic = 'force-dynamic';

import { SignupPage } from '../../components/SignupPage';

export default function Signup() {
    const handleNavigate = (page: string) => {
        if (page === 'home') {
            window.location.href = '/';
        }
    };

    // Add debugging for deployment issues
    console.log('Signup page loaded successfully - Render deployment trigger');

    return (
        <SignupPage onNavigate={handleNavigate} />
    );
}
