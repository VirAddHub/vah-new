'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

type RequestItem = {
    id: number;
    status: string;
    letter_id?: string;
    to_name: string;
    address1: string;
    city: string;
    postal: string;
    country: string;
    reason?: string;
    created_at: string;
    updated_at: string;
};

export default function ForwardingAdmin() {
    const [items, setItems] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function load(status?: string) {
        setLoading(true);
        setError(null);
        try {
            const qs = status ? `?status=${encodeURIComponent(status)}` : '';
            const r = await fetch(`${API}/api/admin/forwarding/requests${qs}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!r.ok) {
                throw new Error(`HTTP ${r.status}: ${r.statusText}`);
            }

            const j = await r.json();
            setItems(j?.data ?? []);
        } catch (e: any) {
            setError(e.message || 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    }

    async function approve(id: number) {
        try {
            const r = await fetch(`${API}/api/admin/forwarding/requests/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved', note: 'Approved from UI' })
            });

            if (!r.ok) {
                throw new Error(`HTTP ${r.status}: ${r.statusText}`);
            }

            load();
        } catch (e: any) {
            alert(`Failed to approve: ${e.message}`);
        }
    }

    async function fulfill(id: number) {
        try {
            const r = await fetch(`${API}/api/admin/forwarding/requests/${id}/fulfill`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courier: 'DHL', tracking: `DEV-${Date.now()}` })
            });

            if (!r.ok) {
                throw new Error(`HTTP ${r.status}: ${r.statusText}`);
            }

            load();
        } catch (e: any) {
            alert(`Failed to fulfill: ${e.message}`);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <div className="p-4 space-y-3">
            <h1 className="text-2xl font-semibold">Forwarding Requests Admin</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={() => load()} className="border px-2 py-1 rounded hover:bg-gray-50">
                    All ({items.length})
                </button>
                <button onClick={() => load('pending')} className="border px-2 py-1 rounded hover:bg-gray-50">
                    Pending
                </button>
                <button onClick={() => load('approved')} className="border px-2 py-1 rounded hover:bg-gray-50">
                    Approved
                </button>
                <button onClick={() => load('fulfilled')} className="border px-2 py-1 rounded hover:bg-gray-50">
                    Fulfilled
                </button>
            </div>

            {loading ? (
                <p>Loading…</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border p-2 text-left">ID</th>
                                <th className="border p-2 text-left">Status</th>
                                <th className="border p-2 text-left">Letter ID</th>
                                <th className="border p-2 text-left">To</th>
                                <th className="border p-2 text-left">Address</th>
                                <th className="border p-2 text-left">Reason</th>
                                <th className="border p-2 text-left">Created</th>
                                <th className="border p-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="border p-4 text-center text-gray-500">
                                        No forwarding requests found
                                    </td>
                                </tr>
                            ) : (
                                items.map(it => (
                                    <tr key={it.id}>
                                        <td className="border p-2">{it.id}</td>
                                        <td className="border p-2">
                                            <span className={`px-2 py-1 rounded text-xs ${it.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    it.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                                        it.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {it.status}
                                            </span>
                                        </td>
                                        <td className="border p-2">{it.letter_id || '-'}</td>
                                        <td className="border p-2">{it.to_name}</td>
                                        <td className="border p-2">
                                            {it.address1}, {it.city} {it.postal}, {it.country}
                                        </td>
                                        <td className="border p-2">{it.reason || '-'}</td>
                                        <td className="border p-2">
                                            {new Date(it.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="border p-2">
                                            <div className="flex gap-2">
                                                {it.status === 'pending' && (
                                                    <button
                                                        onClick={() => approve(it.id)}
                                                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {it.status === 'approved' && (
                                                    <button
                                                        onClick={() => fulfill(it.id)}
                                                        className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                                    >
                                                        Fulfill
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
