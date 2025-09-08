"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetConfirmPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/bff/profile/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: pwd }),
      credentials: "include",
    });
    const j = await r.json();
    setMsg(j.message || (r.ok ? "Done" : "Error"));
    if (r.ok) setTimeout(()=>router.push("/login"), 800);
  }

  if (!token) return <div className="max-w-md mx-auto p-6">Missing token.</div>;
  
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Choose a new password</h1>
      <form onSubmit={submit} className="space-y-4">
        <input 
          className="w-full border rounded p-2" 
          type="password" 
          placeholder="New password"
          value={pwd} 
          onChange={e=>setPwd(e.target.value)} 
          required
          minLength={8}
        />
        <button className="px-4 py-2 rounded bg-black text-white">Update password</button>
      </form>
      {msg && <p className="mt-3">{msg}</p>}
    </div>
  );
}
