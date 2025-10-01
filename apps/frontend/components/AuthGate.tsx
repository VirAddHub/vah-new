import { useAuth } from '../contexts/AuthContext';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return null; // or a splash skeleton to avoid flicker
  return <>{children}</>;
}
