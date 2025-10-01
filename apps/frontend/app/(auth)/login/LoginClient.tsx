"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Login from '../../../components/Login';
import { useAuth } from '../../../contexts/AuthContext';
import { AuthGateOnLoginPage } from '../../../components/AuthGateOnLoginPage';

export default function LoginClient() {
    const router = useRouter();

    return (
        <>
            <AuthGateOnLoginPage />
            <Login
                onNavigate={(page: string) => {
                    if (page === 'signup') router.push('/signup');
                }}
            />
        </>
    );
}
