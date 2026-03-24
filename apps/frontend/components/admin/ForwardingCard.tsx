'use client';

import Link from 'next/link';

export default function ForwardingCard({ data, loading }: { data?: any; loading?: boolean }) {
    if (loading) {
        return <div className="rounded-2xl p-4 bg-card animate-pulse h-56" />;
    }

    const counts = data?.counts || {};

    return (
        <div className="rounded-2xl p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Forwarding Requests</div>
                <Link href="/admin/forwarding" className="text-body-sm underline text-primary">
                    View All
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {['requested', 'reviewed', 'processing', 'dispatched'].map(s => (
                    <div key={s} className="rounded-lg bg-muted p-3 text-center">
                        <div className="text-caption uppercase text-muted-foreground mb-1">{s}</div>
                        <div className="text-h4 font-semibold">{counts[s] ?? 0}</div>
                    </div>
                ))}
            </div>
            {(data?.recent || []).length > 0 && (
                <ul className="divide-y">
                    {data.recent.slice(0, 5).map((r: any) => (
                        <li key={r.id} className="py-2 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="text-body-sm font-medium truncate">#{r.id} — {r.status || 'Unknown'}</div>
                                {r.to_name && (
                                    <div className="text-caption text-muted-foreground truncate">{r.to_name}</div>
                                )}
                                <div className="text-caption text-muted-foreground">
                                    {r.at ? new Date(r.at).toLocaleString() : 'Unknown date'}
                                </div>
                            </div>
                            {r.href && (
                                <Link href={r.href} className="text-body-sm underline ml-2 flex-shrink-0 text-primary">
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

