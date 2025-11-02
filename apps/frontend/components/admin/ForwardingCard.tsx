'use client';

import Link from 'next/link';

export default function ForwardingCard({ data, loading }: { data?: any; loading?: boolean }) {
    if (loading) {
        return <div className="rounded-2xl p-4 bg-white animate-pulse h-56" />;
    }

    const counts = data?.counts || {};

    return (
        <div className="rounded-2xl p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Forwarding Requests</div>
                <Link href="/admin/forwarding" className="text-sm underline" style={{ color: '#5272FF' }}>
                    View All
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {['requested', 'reviewed', 'processing', 'dispatched'].map(s => (
                    <div key={s} className="rounded-lg bg-neutral-50 p-3 text-center">
                        <div className="text-xs uppercase text-neutral-500 mb-1">{s}</div>
                        <div className="text-xl font-semibold">{counts[s] ?? 0}</div>
                    </div>
                ))}
            </div>
            {(data?.recent || []).length > 0 && (
                <ul className="divide-y">
                    {data.recent.slice(0, 5).map((r: any) => (
                        <li key={r.id} className="py-2 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">#{r.id} — {r.status || 'Unknown'}</div>
                                {r.to_name && (
                                    <div className="text-xs text-neutral-500 truncate">{r.to_name}</div>
                                )}
                                <div className="text-xs text-neutral-400">
                                    {r.at ? new Date(r.at).toLocaleString() : 'Unknown date'}
                                </div>
                            </div>
                            {r.href && (
                                <Link href={r.href} className="text-sm underline ml-2 flex-shrink-0" style={{ color: '#5272FF' }}>
                                    Open
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

