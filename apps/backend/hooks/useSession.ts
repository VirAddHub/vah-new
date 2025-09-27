'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useSession() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('vah_token') : null;
    if (!t) { setLoading(false); setUser(null); return; }
    api.get('/api/profile').then((u:any) => {
      setUser(u); setLoading(false);
    }).catch((e:any) => { setError(String(e?.message||e)); setLoading(false); });
  }, []);

  return { user, loading, error };
}
