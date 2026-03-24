'use client';

import { EmailChangeCard } from '@/components/account/EmailChangeCard';
import { ProfileCard } from '@/components/account/ProfileCard';
import { Settings } from 'lucide-react';

export default function AccountSettingsPage() {
    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-5 sm:mb-6 md:mb-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                    <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" strokeWidth={2} />
                    <h1 className="text-h3 sm:text-h2 lg:text-h1 font-semibold text-foreground leading-tight tracking-tight">
                        Settings
                    </h1>
                </div>
                <p className="text-body-sm sm:text-body text-muted-foreground leading-relaxed">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Profile Information Card */}
            <div className="mb-4 sm:mb-6">
                <ProfileCard />
            </div>

            {/* Email Change Card */}
            <EmailChangeCard />
        </div>
    );
}
