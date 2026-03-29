"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchBffWhoami,
  isServerVerifiedAdmin,
  type WhoamiUser,
} from "@/lib/verifiedAdminSession";

export type VerifiedAdminStatus = "loading" | "unauthenticated" | "forbidden" | "ready";

export function useVerifiedAdminSession(): {
  status: VerifiedAdminStatus;
  user: WhoamiUser | null;
  refetch: () => Promise<void>;
} {
  const [status, setStatus] = useState<VerifiedAdminStatus>("loading");
  const [user, setUser] = useState<WhoamiUser | null>(null);

  const run = useCallback(async () => {
    setStatus("loading");
    const r = await fetchBffWhoami();
    if (!r.ok || !r.user) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    if (!isServerVerifiedAdmin(r.user)) {
      setUser(null);
      setStatus("forbidden");
      return;
    }
    setUser(r.user);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return { status, user, refetch: run };
}
