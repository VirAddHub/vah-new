'use client';

import * as React from 'react';

export type Toast = {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type ToastContextValue = {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, ...t }]);
    // auto-dismiss after 4s
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}<ToastViewport /></ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[92vw] max-w-md">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`rounded-xl shadow-lg border p-3 bg-white ${
            t.variant === 'destructive' ? 'border-red-300' : 'border-gray-200'
          }`}
          role="status"
        >
          {t.title && <div className="font-semibold">{t.title}</div>}
          {t.description && <div className="text-sm opacity-80">{t.description}</div>}
          <button
            className="mt-2 text-sm underline"
            onClick={() => t.id && dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
