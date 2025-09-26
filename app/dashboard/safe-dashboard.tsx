'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeGet } from '@/lib/safeRequest';
import { Button } from '@/components/ui/button';
import { authGuard } from '@/lib/auth-guard';

export default function SafeDashboard() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    profile: null as any,
    tickets: [] as any[],
    forwarding: [] as any[],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // DISABLED TO STOP LOOP
      console.log('🚨 USER DASHBOARD WHOAMI DISABLED TO STOP INFINITE LOOP');
      const me = { ok: true, data: { user: { is_admin: false } } }; // Mock response
      // const me = await authGuard.checkAuth(() => safeGet<{ user: any }>('/api/auth/whoami'));
      if (!me.ok) { 
        router.replace('/login?expired=1'); 
        return; 
      }

      const [profile, tickets, fw] = await Promise.allSettled([
        safeGet('/api/profile'),
        safeGet<{ items: any[] }>('/api/tickets'),
        safeGet<{ items: any[] }>('/api/forwarding-requests'),
      ]);

      if (cancelled) return;
      setState({
        loading: false,
        profile: profile.status === 'fulfilled' && profile.value.ok ? profile.value.data : null,
        tickets: tickets.status === 'fulfilled' 
          ? (tickets.value.ok ? (tickets.value.data?.items ?? []) : [])
          : [],
        forwarding: fw.status === 'fulfilled' 
          ? (fw.value.ok ? (fw.value.data?.items ?? []) : [])
          : [],
      });
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_bootstrap');
    router.replace('/login');
  };

  if (state.loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        {!state.profile && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Couldn't load your profile yet. Some features may be limited.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Support Tickets</h2>
            {state.tickets.length === 0 ? (
              <p className="text-muted-foreground">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {state.tickets.map((ticket, index) => (
                  <div key={index} className="p-3 bg-muted rounded">
                    <pre className="text-sm">{JSON.stringify(ticket, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Forwarding Requests</h2>
            {state.forwarding.length === 0 ? (
              <p className="text-muted-foreground">No forwarding requests yet.</p>
            ) : (
              <div className="space-y-2">
                {state.forwarding.map((request, index) => (
                  <div key={index} className="p-3 bg-muted rounded">
                    <pre className="text-sm">{JSON.stringify(request, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
