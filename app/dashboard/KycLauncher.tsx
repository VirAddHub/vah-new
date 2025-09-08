"use client";
import { useState } from "react";

export default function KycLauncher() {
  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setErr(null);
    setLoading(true);
    
    try {
      const r = await fetch("/api/bff/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const j = await r.json();
      
      if (!j.ok) {
        setErr(j.error || "Failed to start KYC");
        return;
      }
      
      setToken(j.token);
      // If using Sumsub WebSDK, init here with `j.token`
      // e.g., window.SumSubSdk.init(j.token, { onMessage:..., onError:... }).launch('#kyc-container')
    } catch (error) {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button 
        onClick={start} 
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting..." : "Start / Continue KYC"}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {token && (
        <div className="text-sm">
          <p className="text-green-600">KYC token ready.</p>
          <p className="text-gray-500">Token: {token.substring(0, 20)}...</p>
        </div>
      )}
      {/* <div id="kyc-container" /> */}
    </div>
  );
}
