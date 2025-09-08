"use client";
import { useState } from "react";

export default function KycLauncher() {
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string>("");

  async function start() {
    setStatus("loading");
    setError("");
    const r = await fetch("/api/bff/kyc/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    const j = await r.json();
    if (!j.ok) {
      setStatus("error");
      setError(j.error || "Failed");
      return;
    }
    setStatus("ready"); // you'll init Sumsub WebSDK here with j.token
  }

  return (
    <div className="space-y-2">
      <button onClick={start} className="px-4 py-2 rounded bg-black text-white">Start / Continue KYC</button>
      {status === "loading" && <p className="text-sm">Preparing KYC…</p>}
      {status === "ready" && <p className="text-sm">KYC token ready.</p>}
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
