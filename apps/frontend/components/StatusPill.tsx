// apps/frontend/components/StatusPill.tsx
"use client";
import { useEffect, useState } from "react";
import { getReady } from "@/lib/api";

export default function StatusPill() {
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");

  async function tick() {
    try {
      const r = await getReady();
      setState(r.status === "ready" ? "ready" : "error");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const cls = state === "ready" ? "bg-green-600"
           : state === "loading" ? "bg-amber-500"
           : "bg-gray-500";
  const label = state === "ready" ? "API Ready"
              : state === "loading" ? "Checking…"
              : "API Down";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-white text-xs ${cls}`}>
      {label}
    </span>
  );
}
