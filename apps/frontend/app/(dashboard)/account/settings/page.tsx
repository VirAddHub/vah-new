'use client';

import { EmailChangeCard } from '@/components/account/EmailChangeCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AccountSettingsPage() {
    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="w-8 h-8 text-primary" strokeWidth={2} />
                    <h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight tracking-tight">
                        Settings
                    </h1>
                </div>
                <p className="text-base text-neutral-600 leading-relaxed">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Email Change Card */}
            <EmailChangeCard />
        </div>
    );
}
