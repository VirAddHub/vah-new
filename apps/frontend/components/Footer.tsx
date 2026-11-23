'use client';

import Link from 'next/link';
import { VAHLogo } from './VAHLogo';
import styles from './marketing.module.css';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

const columns = [
  { title: 'Explore', links: [['Pricing', '/pricing'], ['How it works', '/?section=how'], ['Help centre', '/help'], ['Blog', '/blog']] },
  { title: 'The essentials', links: [['Privacy policy', '/privacy'], ['Terms of service', '/terms'], ['KYC policy', '/kyc']] },
  { title: 'Let’s talk', links: [['hello@virtualaddresshub.co.uk', 'mailto:hello@virtualaddresshub.co.uk'], ['Contact support', '/contact']] },
];

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}><VAHLogo onNavigate={onNavigate} size="lg" variant="onDark" className={styles.brand} /><p>A professional London address.<br />For wherever business takes you.</p></div>
          {columns.map(({ title, links }) => <div key={title}><h2>{title}</h2><div className={styles.footerLinks}>{links.map(([label, href]) => <Link key={href} href={href} onClick={href === '/?section=how' ? (event) => {
            const section = document.getElementById('how');
            if (section) {
              event.preventDefault();
              section.scrollIntoView();
            }
          } : undefined}>{label}</Link>)}</div></div>)}
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} VirtualAddressHub Ltd.</span><span>London address. Wherever you are.</span></div>
      </div>
    </footer>
  );
}
