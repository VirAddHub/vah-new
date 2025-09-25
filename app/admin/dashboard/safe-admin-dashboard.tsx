'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeGet } from '@/lib/safeRequest';
import { Button } from '@/components/ui/button';

export default function SafeAdminDashboard() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    user: null as any,
    users: [] as any[],
    analytics: null as any,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Check if user is admin
      const me = await safeGet<{ user: any }>('/api/auth/whoami');
      if (!me.ok) { 
        router.replace('/login?expired=1'); 
        return; 
      }

      if (!me.data?.user?.is_admin) {
        router.replace('/dashboard');
        return;
      }

      // Load admin data
      const [users, analytics] = await Promise.allSettled([
        safeGet<{ users: any[] }>('/api/admin/users'),
        safeGet('/api/admin/analytics'),
      ]);

      if (cancelled) return;
      setState({
        loading: false,
        user: me.data.user,
        users: users.status === 'fulfilled' && users.value.ok ? users.value.data?.users ?? [] : [],
        analytics: analytics.status === 'fulfilled' && analytics.value.ok ? analytics.value.data : null,
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
        <p className="text-muted-foreground">Loading admin dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {state.user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Users ({state.users.length})</h2>
            {state.users.length === 0 ? (
              <p className="text-muted-foreground">No users found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {state.users.map((user, index) => (
                  <div key={index} className="p-3 bg-muted rounded">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.is_admin ? 'Admin' : 'User'} • {user.status || 'Active'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
            {!state.analytics ? (
              <p className="text-muted-foreground">Analytics data unavailable.</p>
            ) : (
              <div className="space-y-2">
                <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(state.analytics, null, 2)}
                </pre>
              </div>
            )}
          </section>

          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                Manage Users
              </Button>
              <Button className="w-full" variant="outline">
                View Reports
              </Button>
              <Button className="w-full" variant="outline">
                System Settings
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
