'use client';

import * as React from 'react';
import {
  Toast as RToast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
  ToastProvider as RadixToastProvider,
} from './toast';

type ToastOptions = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
  durationMs?: number; // auto-dismiss
};

type ToastContextValue = {
  toast: (opts: ToastOptions) => { id: string };
  dismiss: (id?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast(): {
  toast: ToastContextValue['toast'];
  dismiss: ToastContextValue['dismiss'];
} {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Required<ToastOptions>[]>([]);

  const dismiss = React.useCallback((id?: string) => {
    if (!id) {
      setToasts([]);
      return;
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((opts: ToastOptions) => {
    const id = opts.id ?? Math.random().toString(36).slice(2);
    const duration = opts.durationMs ?? 4000;

    const entry: Required<ToastOptions> = {
      id,
      title: opts.title ?? null,
      description: opts.description ?? null,
      action: opts.action ?? null,
      variant: opts.variant ?? 'default',
      durationMs: duration,
    };

    setToasts((prev) => [...prev, entry]);

    // auto-dismiss
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }

    return { id };
  }, [dismiss]);

  return (
    <RadixToastProvider>
      <ToastContext.Provider value={{ toast, dismiss }}>
        {children}

        {/* Render active toasts */}
        {toasts.map((t) => (
          <RToast
            key={t.id}
            data-variant={t.variant}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          >
            {t.title ? <ToastTitle>{t.title}</ToastTitle> : null}
            {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
            {t.action}
            <ToastClose />
          </RToast>
        ))}

        <ToastViewport />
      </ToastContext.Provider>
    </RadixToastProvider>
  );
}