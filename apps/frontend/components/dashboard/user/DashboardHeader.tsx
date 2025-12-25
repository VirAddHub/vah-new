'use client';

import Link from 'next/link';
import { User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VAHLogo } from '@/components/VAHLogo';

interface DashboardHeaderProps {
  onNavigate: (page: string, data?: any) => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
}

export function DashboardHeader({ onNavigate, onLogout, userName, userEmail }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="safe-pad mx-auto max-w-screen-xl">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Name */}
          <div className="flex items-center gap-4">
            <VAHLogo onNavigate={onNavigate} size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Dashboard navigation">
            <Link
              href="/account"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
            <button
              onClick={() => window.open('/help', '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Open help in a new tab"
              type="button"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm">
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
            <Button variant="outline" size="sm" onClick={onLogout} className="tt-min flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}


