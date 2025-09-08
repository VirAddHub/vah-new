"use client";
import { useEffect, useState } from "react";

type F = { id: number; name: string; path: string; mime: string; created_at: number };

export default function FilesPage() {
    const [items, setItems] = useState<F[]>([]);
    useEffect(() => {
        // quick reuse: show recent from mail-items/search when tag=Scan
        fetch("/api/bff/mail-items/search?tag=Scan&limit=50", { credentials: "include" })
            .then(r => r.json()).then(j => {
                // you can expand with a dedicated /api/files list later
                setItems((j.items || []).map((m: any) => ({ id: m.file_id, name: m.subject, path: m.notes, mime: "application/pdf", created_at: m.created_at })));
            });
    }, []);

    async function openLink(id: number) {
        const r = await fetch(`/api/bff/files/${id}/signed-url`, { method: "POST", credentials: "include" });
        const j = await r.json();
        if (j.ok && j.url) window.open(j.url, "_blank");
        else alert("Failed to generate link");
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
            <h1 className="text-xl font-semibold">Scanned Files</h1>
            <ul className="divide-y rounded border">
                {items.map(it => (
                    <li key={it.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                        </div>
                        <button onClick={() => openLink(it.id)} className="px-3 py-1 rounded bg-black text-white">Get secure link</button>
                    </li>
                ))}
                {items.length === 0 && <li className="p-6 text-center text-sm text-gray-500">No files</li>}
            </ul>
        </main>
    );
}
