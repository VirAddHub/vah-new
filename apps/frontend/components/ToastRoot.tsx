"use client";

import { ToastProvider } from "@/components/ui/use-toast";

export function ToastRoot({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

