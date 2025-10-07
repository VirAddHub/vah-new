// apps/frontend/app/settings/profile/page.tsx
"use client";

export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { getMe, patchMe } from "@/lib/api";

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ 
        name: "", 
        avatarUrl: "", 
        marketingOptIn: false,
        forwarding_address: ""
    });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        getMe()
            .then(r => {
                const u = r.data.user ?? {};
                setForm({
                    name: u.name ?? "",
                    avatarUrl: u.avatarUrl ?? "",
                    marketingOptIn: !!u.marketingOptIn,
                    forwarding_address: u.forwarding_address ?? ""
                });
            })
            .finally(() => setLoading(false));
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg("");
        try {
            await patchMe(form);
            setMsg("Saved");
        } catch (e: any) {
            setMsg(e?.payload?.error?.message ?? "Failed");
        }
    }

    if (loading) return <p className="p-6">Loading…</p>;

    return (
        <main className="p-6 max-w-xl">
            <h1 className="text-xl font-semibold mb-4">Profile</h1>
            <form onSubmit={onSubmit} className="grid gap-4">
                <label className="grid gap-1">
                    <span>Name</span>
                    <input className="border rounded p-2" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="grid gap-1">
                    <span>Avatar URL</span>
                    <input className="border rounded p-2" value={form.avatarUrl}
                        onChange={e => setForm({ ...form, avatarUrl: e.target.value })} />
                </label>
                <label className="grid gap-1">
                    <span>Forwarding Address</span>
                    <textarea 
                        className="border rounded p-2 h-24" 
                        value={form.forwarding_address}
                        onChange={e => setForm({ ...form, forwarding_address: e.target.value })}
                        placeholder="Enter your forwarding address (name, address lines, city, postal code, country)"
                    />
                    <p className="text-xs text-gray-500">
                        This address will be used automatically when you request mail forwarding.
                    </p>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.marketingOptIn}
                        onChange={e => setForm({ ...form, marketingOptIn: e.target.checked })} />
                    <span>Marketing opt-in</span>
                </label>
                <button className="rounded-2xl px-4 py-2 bg-black text-white">Save</button>
                {msg && <p className="text-sm">{msg}</p>}
            </form>
        </main>
    );
}
