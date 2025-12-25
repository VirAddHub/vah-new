'use client';

import { useAdminDependencies } from '@/lib/hooks/useAdminOverview';
import { StatusBadge } from './StatusBadge';

export default function SystemHealthCard() {
    const { data, error, isLoading } = useAdminDependencies();

    if (isLoading) {
        return <div className="rounded-2xl p-4 bg-white animate-pulse h-40" />;
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl p-4 bg-white border border-red-200">
                <div className="font-medium text-red-600">Failed to load system health</div>
                <div className="text-xs text-neutral-500 mt-1">
                    {error instanceof Error ? error.message : 'Unknown error'}
                </div>
            </div>
        );
    }

    const deps = data as any;

    return (
        <div className="rounded-2xl p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="font-medium">System Health</div>
                <StatusBadge severity={deps.severity || 'down'} />
            </div>
            <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between py-1">
                    <span className="text-sm">Database</span>
                    <StatusBadge severity={deps.db?.severity || 'down'} />
                </li>
                {(deps.dependencies || []).map((d: any) => (
                    <li key={d.name} className="flex items-center justify-between py-1">
                        <span className="text-sm capitalize">{d.name.replace(/_/g, ' ')}</span>
                        <StatusBadge severity={d.severity || 'down'} />
                    </li>
                ))}
            </ul>
            <div className="text-xs text-neutral-500 mt-3">
                Checked {new Date(deps.checked_at || Date.now()).toLocaleString()}
            </div>
        </div>
    );
}

