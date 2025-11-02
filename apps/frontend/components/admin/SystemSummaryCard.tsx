'use client';

export default function SystemSummaryCard({ data, loading }: { data?: any; loading?: boolean }) {
    if (loading) {
        return <div className="rounded-2xl p-4 bg-white animate-pulse h-48" />;
    }

    const m = data?.metrics;

    return (
        <div className="rounded-2xl p-4 bg-white shadow-sm">
            <div className="font-medium mb-3">System Summary</div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
                <li className="rounded bg-neutral-50 p-3">
                    <div className="text-neutral-500 text-xs">Total Users</div>
                    <div className="font-semibold text-lg">{m?.totals?.users ?? '—'}</div>
                </li>
                <li className="rounded bg-neutral-50 p-3">
                    <div className="text-neutral-500 text-xs">Deleted Users</div>
                    <div className="font-semibold text-lg">{m?.totals?.deleted_users ?? '—'}</div>
                </li>
                <li className="rounded bg-neutral-50 p-3">
                    <div className="text-neutral-500 text-xs">Mail (30d)</div>
                    <div className="font-semibold text-lg">{m?.mail?.last30d ?? '—'}</div>
                </li>
                <li className="rounded bg-neutral-50 p-3">
                    <div className="text-neutral-500 text-xs">Active Forwards</div>
                    <div className="font-semibold text-lg">{m?.forwards?.active ?? '—'}</div>
                </li>
            </ul>
            {data?.generated_at && (
                <div className="text-xs text-neutral-500 mt-3">
                    Generated {new Date(data.generated_at).toLocaleString()}
                </div>
            )}
        </div>
    );
}

