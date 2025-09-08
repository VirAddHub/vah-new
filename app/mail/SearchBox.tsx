"use client";
import { useState, useEffect } from "react";

type Item = { id: number; subject: string; sender_name: string; tag?: string; status?: string; created_at: number };

export default function SearchBox() {
    const [q, setQ] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            const r = await fetch(`/api/bff/mail/search?q=${encodeURIComponent(q)}&limit=20`, {
                credentials: "include",
                signal: ctrl.signal,
            });
            const j = await r.json();
            if (j.ok) { setItems(j.items); setTotal(j.total); }
        }, 250);
        return () => { ctrl.abort(); clearTimeout(t); };
    }, [q]);

    return (
        <div className="space-y-3">
            <input className="w-full border rounded p-2" placeholder="Search mail…" value={q} onChange={e => setQ(e.target.value)} />
            <div className="text-sm text-gray-600">Results: {total}</div>
            <ul className="divide-y">
                {items.map(it => (
                    <li key={it.id} className="py-2">
                        <div className="font-medium">{it.subject || "(no subject)"}</div>
                        <div className="text-sm">{it.sender_name || "—"}</div>
                        <div className="text-xs text-gray-500">{[it.tag, it.status].filter(Boolean).join(" • ")}</div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
