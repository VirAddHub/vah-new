'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections: Record<string, string> = {
  '/mail': 'Mail inbox', '/forwarding': 'Mail forwarding', '/billing': 'Billing',
  '/business-owners': 'Business owners', '/account/overview': 'Account overview',
  '/account/billing': 'Plan & billing', '/account/addresses': 'Business addresses',
  '/account/verification': 'Identity verification', '/account/support': 'Support',
  '/account/settings': 'Account settings', '/account/businesses': 'Your businesses',
};
export function CustomerWorkspaceBar() {
  const path = usePathname();
  return <div className="customer-workspace-bar">
    <nav aria-label="Breadcrumb"><Link href="/account/overview">Your workspace</Link><span aria-hidden="true">/</span><span aria-current="page">{sections[path] || 'Your account'}</span></nav>
    <Link href="/account/support" className="customer-workspace-help">Need a hand? <span aria-hidden="true">↗</span></Link>
  </div>;
}
