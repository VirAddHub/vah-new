"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

interface AdminHeartbeatContextType {
  registerPolling: (key: string, callback: () => Promise<void>) => void;
  unregisterPolling: (key: string) => void;
  triggerRefresh: () => void;
}

const AdminHeartbeatContext = createContext<AdminHeartbeatContextType | null>(null);

export function AdminHeartbeatProvider({ children }: { children: React.ReactNode }) {
  const pollingCallbacks = useRef<Map<string, () => Promise<void>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const executeAllCallbacks = useCallback(async () => {
    if (!mountedRef.current) return;

    const promises = Array.from(pollingCallbacks.current.values()).map(callback =>
      callback().catch(err => console.warn('Polling callback failed:', err))
    );

    await Promise.allSettled(promises);
  }, []);

  const registerPolling = useCallback((key: string, callback: () => Promise<void>) => {
    pollingCallbacks.current.set(key, callback);

    // Start timer if this is the first registration
    if (pollingCallbacks.current.size === 1 && !timerRef.current) {
      executeAllCallbacks(); // Initial call
      timerRef.current = setInterval(executeAllCallbacks, 30_000);
    }
  }, [executeAllCallbacks]);

  const unregisterPolling = useCallback((key: string) => {
    pollingCallbacks.current.delete(key);

    // Stop timer if no more callbacks
    if (pollingCallbacks.current.size === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    executeAllCallbacks();
  }, [executeAllCallbacks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <AdminHeartbeatContext.Provider value={{ registerPolling, unregisterPolling, triggerRefresh }}>
      {children}
    </AdminHeartbeatContext.Provider>
  );
}

export function useAdminHeartbeat() {
  const context = useContext(AdminHeartbeatContext);
  if (!context) {
    throw new Error('useAdminHeartbeat must be used within AdminHeartbeatProvider');
  }
  return context;
}
