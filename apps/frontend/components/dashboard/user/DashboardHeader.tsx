'use client';

import Link from 'next/link';
import { User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VAHLogo } from '@/components/VAHLogo';

/**
 * Premium Dashboard Header
 * 
 * Design principles from design-system.ts:
 * - Clean, minimal header (64px height)
 * - Subtle border, no heavy shadows
 * - Consistent spacing (16px/24px)
 * - lucide-react icons with strokeWidth={2}
 */

interface DashboardHeaderProps {
  onNavigate: (page: string, data?: any) => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
}

export function DashboardHeader({ onNavigate, onLogout, userName, userEmail }: DashboardHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <VAHLogo onNavigate={onNavigate} size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Dashboard navigation">
            <button
              onClick={() => window.open('/help', '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Open help in a new tab"
              type="button"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={2} />
              Help Centre
            </button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-right">
              <p className="font-medium text-neutral-900">{userName}</p>
              {userEmail && (
                <p className="text-xs text-neutral-500">{userEmail}</p>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout} 
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}


