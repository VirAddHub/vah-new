"use client";
export default function DirectDebitButton() {
  async function start() {
    const r = await fetch("/api/bff/gc/redirect-flow/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    const j = await r.json();
    if (j.ok && j.redirect_url) {
      window.location.href = j.redirect_url;
    } else {
      alert("Failed to start Direct Debit setup");
    }
  }
  return (
    <button onClick={start} className="px-4 py-2 rounded bg-black text-white">
      Set up Direct Debit
    </button>
  );
}
