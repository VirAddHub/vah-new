'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Navbar() {
  const p = usePathname();
  const r = useRouter();
  function active(path: string) { return p.startsWith(path) ? 'underline' : 'opacity-80'; }
  function logout() { localStorage.removeItem('vah_token'); r.push('/(auth)/login'); }
  return (
    <nav className="w-full border-b border-white/10 sticky top-0 bg-[color:var(--bg)]/70 backdrop-blur z-50">
      <div className="mx-auto max-w-6xl p-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">VAH</Link>
        <Link href="/dashboard" className={active('/dashboard')}>Dashboard</Link>
        <Link href="/mail" className={active('/mail')}>Mail</Link>
        <Link href="/support/tickets" className={active('/support')}>Support</Link>
        <Link href="/billing" className={active('/billing')}>Billing</Link>
        <Link href="/help" className={active('/help')}>Help</Link>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/profile" className={active('/profile')}>Profile</Link>
          <button onClick={logout} className="text-sm opacity-70 hover:opacity-100">Logout</button>
        </div>
      </div>
    </nav>
  );
}
