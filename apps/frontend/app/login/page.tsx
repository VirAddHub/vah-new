"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Login from '../../components/Login';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();

    // Simple login page - AuthGate handles all authentication logic
    return (
        <Login
            onNavigate={(page: string) => {
                if (page === 'signup') router.push('/signup');
            }}
        />
    );
}
