'use client';

import Link from 'next/link';

const iconMap: Record<string, string> = {
    Mail: '✉️',
    Package: '📦',
    CreditCard: '💳',
    ShieldCheck: '🛡️',
    User: '👤',
    Activity: '📝'
};

export default function RecentActivityCard({ data, loading }: { data?: any; loading?: boolean }) {
    if (loading) {
        return <div className="rounded-2xl p-4 bg-card animate-pulse h-64" />;
    }

    if (!data?.items?.length) {
        return (
            <div className="rounded-2xl p-4 bg-card shadow-sm">
                <div className="font-medium mb-2">Recent Activity</div>
                <div className="text-body-sm text-muted-foreground">No recent activity.</div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl p-4 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Recent Activity</div>
                <Link href="/admin/activity" className="text-body-sm underline text-primary">
                    View All
                </Link>
            </div>
            <ul className="divide-y">
                {data.items.slice(0, 8).map((a: any) => (
                    <li key={a.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-body-lg flex-shrink-0">{iconMap[a.icon] ?? '📝'}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-body-sm font-medium truncate">{a.type || a.title || 'Activity'}</div>
                                {a.description && (
                                    <div className="text-caption text-muted-foreground truncate">{a.description}</div>
                                )}
                                <div className="text-caption text-muted-foreground">
                                    {a.time || (a.at ? new Date(a.at).toLocaleString() : 'Unknown time')}
                                </div>
                            </div>
                        </div>
                        {a.href && (
                            <Link href={a.href} className="text-body-sm underline ml-2 flex-shrink-0 text-primary">
                                Open
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

