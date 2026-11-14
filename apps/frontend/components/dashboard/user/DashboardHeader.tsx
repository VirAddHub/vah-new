'use client';

import Link from 'next/link';
import { User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VAHLogo } from '@/components/VAHLogo';

/**
 * Premium Dashboard Header
 * 
 * Design principles:
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
    <header className="border-b border-border bg-background/95 backdrop-blur-sm">
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
              className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Open help in a new tab"
              type="button"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={2} />
              Help Centre
            </button>
          </nav>

          {/* User Menu - Sign out on desktop, mobile uses drawer */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-body-sm text-right">
              <p className="font-medium text-foreground">{userName}</p>
              {userEmail && (
                <p className="text-caption text-muted-foreground">{userEmail}</p>
              )}
            </div>
            {/* Sign out - desktop only (mobile uses drawer) */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout} 
              className="hidden lg:flex items-center gap-2"
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


