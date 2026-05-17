"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from "lucide-react";
import { VAHLogo } from './VAHLogo';

interface MarketingNavigationProps {
  onNavigate?: (page: string) => void;
}

export function MarketingNavigation({ onNavigate }: MarketingNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Desktop nav — all links
  const desktopLinks = [
    { label: 'Pricing',      anchor: '#pricing' },
    { label: 'How it works', anchor: '#how'     },
    { label: 'Your mail',    anchor: '#mail'    },
    { label: 'FAQ',          anchor: '#faq'     },
    { label: 'Help',         page:   'help'     },
  ];

  // Mobile overlay — only essential links, no anchor-only scroll items
  const mobileLinks = [
    { label: 'Pricing',  anchor: '#pricing' },
    { label: 'Help',     page:   'help'     },
    { label: 'Blog',     page:   'blog'     },
    { label: 'Contact',  page:   'contact'  },
  ];

  const handleNavClick = (item: { anchor?: string; page?: string }) => {
    setIsMenuOpen(false);
    if (item.anchor) {
      const el = document.querySelector(item.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push(`/${item.anchor}`);
      }
      return;
    }
    if (item.page) {
      router.push(`/${item.page}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-mix-paper border-b border-mix-rule">
        <div className="flex items-center justify-between px-5 sm:px-10 lg:px-14 h-16 sm:h-20">

          {/* Logo */}
          <VAHLogo onNavigate={onNavigate} size="lg" />

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
            {desktopLinks.map((item) =>
              item.anchor ? (
                <a
                  key={item.label}
                  href={item.anchor}
                  className="font-dmsans text-[15px] font-medium text-mix-ink2 hover:opacity-70 transition-opacity no-underline"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className="font-dmsans text-[15px] font-medium text-mix-ink2 hover:opacity-70 transition-opacity"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/login"
              className="font-dmsans text-[15px] font-medium text-mix-ink2 hover:opacity-70 transition-opacity no-underline"
            >
              Log in
            </Link>
            <button
              onClick={() => router.push('/signup')}
              className="bg-mix-green text-mix-paper-light px-5 py-2.5 rounded font-dmsans text-[15px] font-medium hover:bg-mix-green-deep transition-colors"
            >
              Get started →
            </button>
          </div>

          {/* Mobile — Log in + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/login"
              className="font-dmsans text-[13px] font-medium text-mix-ink2 hover:opacity-70 transition-opacity no-underline"
            >
              Log in
            </Link>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -mr-1 text-mix-ink2"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile overlay — sits above everything, doesn't push content */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col bg-mix-paper">

          {/* Overlay header — matches nav bar height */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-mix-rule shrink-0">
            <VAHLogo onNavigate={() => { setIsMenuOpen(false); onNavigate?.('home'); }} size="lg" />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 -mr-1 text-mix-ink2"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 flex flex-col px-6 pt-6 gap-1 overflow-y-auto">
            {mobileLinks.map((item) =>
              item.anchor ? (
                <a
                  key={item.label}
                  href={item.anchor}
                  onClick={() => setIsMenuOpen(false)}
                  className="py-4 font-newsreader text-[22px] text-mix-ink border-b border-mix-rule no-underline hover:text-mix-green transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className="py-4 text-left font-newsreader text-[22px] text-mix-ink border-b border-mix-rule hover:text-mix-green transition-colors"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* Bottom CTA */}
          <div className="px-6 pb-10 pt-6 shrink-0">
            <button
              onClick={() => { setIsMenuOpen(false); router.push('/signup'); }}
              className="w-full bg-mix-green text-mix-paper-light py-4 rounded font-dmsans text-[15px] font-medium hover:bg-mix-green-deep transition-colors"
            >
              Get started →
            </button>
          </div>

        </div>
      )}
    </>
  );
}
