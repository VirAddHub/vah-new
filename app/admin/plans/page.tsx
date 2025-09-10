'use client';
import { useEffect, useState } from "react";
import { centsToGBP } from "@/lib/money";

type Plan = {
    id: number; name: string; description?: string; price_pence: number; interval: string;
    features: string[]; active: number; sort: number;
};

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    const res = await fetch(`${base}${url}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "X-Dev-Admin": "1", // Dev bypass for admin routes
            ...(init?.headers || {})
        },
        credentials: "include",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

export default function AdminPlansPage() {
    const [rows, setRows] = useState<Plan[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", price_pence: 999, interval: "month", featuresRaw: "" });

    async function load() {
        setErr(null);
        try {
            const j = await api<{ data: Plan[] }>("/api/admin/plans");
            setRows(j.data);
        } catch (e: any) { setErr(e.message); }
    }
    useEffect(() => { load(); }, []);

    async function createPlan() {
        setBusy(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                price_pence: Number(form.price_pence) || 0,
                interval: form.interval,
                features: form.featuresRaw ? form.featuresRaw.split("\n").map(s => s.trim()).filter(Boolean) : [],
                active: 1,
                sort: rows.length,
            };
            await api("/api/admin/plans", { method: "POST", body: JSON.stringify(payload) });
            setForm({ name: "", description: "", price_pence: 999, interval: "month", featuresRaw: "" });
            await load();
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    }

    async function toggleActive(id: number, current: number) {
        setBusy(true);
        try {
            await api(`/api/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify({ active: !current }) });
            await load();
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    }

    async function deletePlan(id: number) {
        if (!confirm("Are you sure you want to delete this plan? This will set it to inactive.")) return;
        setBusy(true);
        try {
            await api(`/api/admin/plans/${id}`, { method: "DELETE" });
            await load();
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Plans (Admin)</h1>
            {err && <div className="text-sm text-red-400">{err}</div>}

            <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-white/10 rounded-xl p-4">
                    <h2 className="font-medium mb-3">Create plan</h2>
                    <div className="space-y-3">
                        <input className="w-full rounded bg-white/5 p-2" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <textarea className="w-full rounded bg-white/5 p-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <input className="rounded bg-white/5 p-2" placeholder="Price (pence)" type="number" value={form.price_pence} onChange={e => setForm({ ...form, price_pence: Number(e.target.value) })} />
                            <input className="rounded bg-white/5 p-2" placeholder="Interval (month/year/...)" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value })} />
                        </div>
                        <textarea className="w-full rounded bg-white/5 p-2" placeholder="Features (one per line)" value={form.featuresRaw} onChange={e => setForm({ ...form, featuresRaw: e.target.value })} />
                        <button disabled={busy || !form.name} onClick={createPlan} className="px-4 py-2 rounded bg-green-600 disabled:opacity-50">Create</button>
                    </div>
                </div>

                <div className="border border-white/10 rounded-xl p-4 overflow-x-auto">
                    <h2 className="font-medium mb-3">Existing plans</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-white/10">
                                <th className="py-2 pr-3">Name</th>
                                <th className="py-2 pr-3">Price</th>
                                <th className="py-2 pr-3">Interval</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-b border-white/5">
                                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                                    <td className="py-2 pr-3">{centsToGBP(r.price_pence)}</td>
                                    <td className="py-2 pr-3 capitalize">{r.interval}</td>
                                    <td className="py-2 pr-3">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.active
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                            }`}>
                                            {r.active ? '✓ Active' : '○ Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3">
                                        <div className="flex gap-2">
                                            <button
                                                disabled={busy}
                                                onClick={() => toggleActive(r.id, r.active)}
                                                className={`px-3 py-1 rounded text-xs font-medium transition ${r.active
                                                        ? 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30'
                                                        : 'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30'
                                                    } disabled:opacity-50`}
                                            >
                                                {r.active ? "Deactivate" : "Activate"}
                                            </button>
                                            <button
                                                disabled={busy}
                                                onClick={() => deletePlan(r.id)}
                                                className="px-3 py-1 rounded text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-600/30 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={5} className="py-4 text-gray-400">No plans yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}