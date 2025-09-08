"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ConfirmClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/bff/profile/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, new_password: password }),
      });
      const j = await r.json();
      setMsg(j?.message || (r.ok ? "Password updated." : "Reset failed."));
      if (r.ok) setTimeout(() => router.push("/login"), 800);
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <div className="max-w-md mx-auto p-6">Missing token.</div>;

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2"
          required
          minLength={8}
        />
        <button
          disabled={busy}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
