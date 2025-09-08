"use client";
import { useState } from "react";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/bff/profile/reset-password-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    setSent(true);
  }
  
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset your password</h1>
      {sent ? (
        <p>If an account exists for that email, we've sent a reset link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input 
            className="w-full border rounded p-2" 
            placeholder="you@example.com"
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            required
          />
          <button className="px-4 py-2 rounded bg-black text-white">Send reset link</button>
        </form>
      )}
    </div>
  );
}
