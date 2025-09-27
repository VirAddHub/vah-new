"use client";

import { SignupPage } from '../../components/SignupPage';

export default function Signup() {
    const handleNavigate = (page: string) => {
        if (page === 'home') {
            window.location.href = '/';
        }
    };

    return (
        <SignupPage onNavigate={handleNavigate} />
    );
}
