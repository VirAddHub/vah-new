'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Menu, X } from 'lucide-react';
import { VAHLogo } from './VAHLogo';
import styles from './marketing.module.css';

interface MarketingNavigationProps {
  onNavigate?: (page: string) => void;
}

const links = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Help', href: '/help' },
];

export function MarketingNavigation({ onNavigate }: MarketingNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.navInner}`}>
        <VAHLogo onNavigate={onNavigate} size="lg" className={styles.brand} />
        <nav aria-label="Main navigation" className={styles.desktopNav}>
          {links.map(({ label, href }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
        </nav>
        <div className={styles.authNav}>
          <Link href="/login" className={styles.loginLink}>Log in</Link>
          <Link href="/signup" className={styles.primaryButton}>Get started <ArrowRight size={16} /></Link>
          <Dialog.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Dialog.Trigger className={styles.menuTrigger} aria-label="Open menu"><Menu size={20} /></Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.mobileOverlay} />
              <Dialog.Content className={styles.mobileMenu}>
                <div className={styles.menuHeading}>
                  <Dialog.Title>Explore VirtualAddressHub</Dialog.Title>
                  <Dialog.Close className={styles.closeMenu} aria-label="Close menu"><X size={20} /></Dialog.Close>
                </div>
                <Dialog.Description className={styles.menuDescription}>A professional address. A simpler way to manage your post.</Dialog.Description>
                <nav aria-label="Mobile navigation">
                  {[...links, { label: 'Contact', href: '/contact' }].map(({ label, href }) => <Link key={href} href={href} onClick={() => setIsMenuOpen(false)}>{label}</Link>)}
                </nav>
                <Link href="/signup" className={styles.primaryButton} onClick={() => setIsMenuOpen(false)}>Get started <ArrowRight size={18} /></Link>
                <Link href="/login" className={styles.textButton} onClick={() => setIsMenuOpen(false)}>Log in to your account</Link>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
