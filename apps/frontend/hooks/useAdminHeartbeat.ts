"use client";
import { useEffect, useRef } from "react";

let globalTimer: ReturnType<typeof setInterval> | null = null;
let subscribers = 0;

export function useAdminHeartbeat(cb: () => void, intervalMs = 30_000) {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    subscribers += 1;

    if (!globalTimer) {
      globalTimer = setInterval(() => {
        // call latest callback for each subscriber tick
        cbRef.current?.();
      }, intervalMs);
    }

    return () => {
      subscribers -= 1;
      if (subscribers <= 0 && globalTimer) {
        clearInterval(globalTimer);
        globalTimer = null;
      }
    };
  }, [intervalMs]);
}
