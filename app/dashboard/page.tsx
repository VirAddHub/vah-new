'use client';

import { useSession } from '@/hooks/useSession';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading, error } = useSession();

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Hello, {user?.first_name || user?.name || 'there'} 👋</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Link className="rounded bg-white/10 p-4 hover:bg-white/20" href="/mail">📬 Mail</Link>
        <Link className="rounded bg-white/10 p-4 hover:bg-white/20" href="/support/tickets">🆘 Support</Link>
        <Link className="rounded bg-white/10 p-4 hover:bg-white/20" href="/billing">💳 Billing</Link>
      </div>
    </section>
  );
}
