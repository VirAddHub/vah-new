// apps/frontend/lib/auth.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "./api";

type AuthState = { loading: boolean; user: any | null };
const AuthCtx = createContext<AuthState>({ loading: true, user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null });

  useEffect(() => {
    getMe()
      .then(r => setState({ loading: false, user: r.data.user }))
      .catch(() => setState({ loading: false, user: null }));
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useUser = () => useContext(AuthCtx);
