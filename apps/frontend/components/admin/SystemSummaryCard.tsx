'use client';

export default function SystemSummaryCard({ data, loading }: { data?: any; loading?: boolean }) {
    if (loading) {
        return <div className="rounded-2xl p-4 bg-card animate-pulse h-48" />;
    }

    const m = data?.metrics;

    return (
        <div className="rounded-2xl p-4 bg-card shadow-sm">
            <div className="font-medium mb-3">System Summary</div>
            <ul className="grid grid-cols-2 gap-3 text-body-sm">
                <li className="rounded bg-muted/50 p-3">
                    <div className="text-muted-foreground text-caption">Total Users</div>
                    <div className="font-semibold text-body-lg">{m?.totals?.users ?? '—'}</div>
                </li>
                <li className="rounded bg-muted/50 p-3">
                    <div className="text-muted-foreground text-caption">Deleted Users</div>
                    <div className="font-semibold text-body-lg">{m?.totals?.deleted_users ?? '—'}</div>
                </li>
                <li className="rounded bg-muted/50 p-3">
                    <div className="text-muted-foreground text-caption">Mail (30d)</div>
                    <div className="font-semibold text-body-lg">{m?.mail?.last30d ?? '—'}</div>
                </li>
                <li className="rounded bg-muted/50 p-3">
                    <div className="text-muted-foreground text-caption">Active Forwards</div>
                    <div className="font-semibold text-body-lg">{m?.forwards?.active ?? '—'}</div>
                </li>
            </ul>
            {data?.generated_at && (
                <div className="text-caption text-muted-foreground mt-3">
                    Generated {new Date(data.generated_at).toLocaleString()}
                </div>
            )}
        </div>
    );
}

