'use client';

import { api } from '@/lib/api';
import { clearToken } from '@/lib/auth';

export function LogoutButton() {
  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    clearToken();
    window.location.href = '/login';
  }
  return <button onClick={logout} className="text-sm underline">Logout</button>;
}