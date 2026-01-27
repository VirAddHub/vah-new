'use client';

import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

/**
 * Shared Public Layout
 * 
 * Used by all public marketing pages (help, pricing, blog, etc.)
 * Ensures consistent navigation, spacing, and scroll behavior
 * 
 * Structure:
 * - Fixed header height (h-16)
 * - Flex column layout (min-h-screen)
 * - Main content area (flex-1)
 * - Footer at bottom
 * 
 * No page-specific overrides, no duplicate headers
 */
export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                {children}
            </main>
            <FooterWithNav />
        </div>
    );
}
