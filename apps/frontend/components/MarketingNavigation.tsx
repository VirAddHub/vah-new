'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VAHLogo } from './VAHLogo';
import { services } from '@/lib/marketing';
import styles from './marketing/Navigation.module.css';
export function MarketingNavigation({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [path]);
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <VAHLogo onNavigate={onNavigate} size="lg" />
        <button
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close menu' : 'Menu'}
        </button>
        <nav
          id="public-navigation"
          aria-label="Main navigation"
          className={`${styles.nav} ${open ? styles.open : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
            }
          }}
        >
          <details className={styles.dropdown}>
            <summary>Services</summary>
            <div>
              {services.map((v) => (
                <Link
                  onClick={(e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    setOpen(false);
                  }}
                  key={v.slug}
                  href={`/${v.slug}`}
                >
                  {v.title}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/london-address">Our London address</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/how-it-works">How it works</Link>
          <details className={styles.dropdown}>
            <summary>Resources</summary>
            <div>
              <Link href="/guides">Business guides</Link>
              <Link href="/help">Help centre</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/#faq">FAQs</Link>
            </div>
          </details>
          <Link href="/about">About</Link>
          <Link href="/login">Log in</Link>
          <Link className={styles.cta} href="/signup">
            Get your address ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}
