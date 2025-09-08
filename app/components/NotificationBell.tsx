"use client";
import { useEffect, useState } from "react";

type N = { id:number; type:string; title:string; body?:string; meta?:any; created_at:number; read_at:number|null };
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/bff/notifications?limit=20", { credentials: "include" });
    const j = await r.json();
    if (j.ok) { setItems(j.items); setUnread(j.unread || 0); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function markAllRead() {
    await fetch("/api/bff/notifications/mark-read", { method: "POST", headers: { "Content-Type":"application/json" }, credentials: "include", body: "{}" });
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, read_at: Date.now() })));
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-2 rounded hover:bg-gray-100">
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium">Notifications</div>
            <button onClick={markAllRead} className="text-xs underline">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
            {!loading && items.length === 0 && <div className="p-3 text-sm text-gray-500">No notifications</div>}
            {items.map(n => (
              <div key={n.id} className="p-3 border-b last:border-0">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-gray-600 mt-1">{n.body}</div>}
                {n.meta?.url && (
                  <a href={n.meta.url} className="text-xs text-blue-600 underline mt-1 inline-block">Open link</a>
                )}
                <div className="text-[11px] text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                  {n.read_at == null && <span className="ml-2 text-amber-700">• unread</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
