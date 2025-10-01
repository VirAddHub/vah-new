// apps/frontend/contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { AuthAPI } from '@/lib/api-client';
import { api } from '@/lib/api';
import { getToken, clearToken } from '@/lib/token-manager';
import { useRouter } from 'next/navigation';

type User = { user_id: string; email: string; role?: string; is_admin?: boolean };
type Ctx = { user: User | null; login: (e: string, p: string) => Promise<void>; logout: () => void; };
const Ctx = createContext<Ctx>({ user: null, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    (async () => {
      try {
        const r = await api('/api/auth/whoami');
        const j = await r.json();
        if (j?.ok && j?.data) setUser(j.data as User);
      } catch {}
    })();
  }, []);

  const login = async (email: string, password: string) => {
    await AuthAPI.login(email, password); // stores token
    const r = await api('/api/auth/whoami'); // now includes Authorization
    const j = await r.json();
    if (j?.ok && j?.data) setUser(j.data as User);
    router.push('/dashboard');
  };

  const logout = () => { clearToken(); setUser(null); router.push('/login'); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);