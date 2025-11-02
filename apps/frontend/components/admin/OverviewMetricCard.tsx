'use client';

import Link from 'next/link';

export default function OverviewMetricCard({
    title,
    value,
    sub,
    href,
    loading,
}: {
    title: string;
    value: string | number;
    sub?: string;
    href?: string;
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="rounded-2xl p-4 shadow-sm bg-white animate-pulse h-24" />
        );
    }

    if (href) {
        return (
            <Link href={href} className="block group">
                <div className="rounded-2xl p-4 shadow-sm bg-white hover:shadow-md transition group-hover:border-2" style={{ borderColor: '#20603A' }}>
                    <div className="text-sm text-neutral-500">{title}</div>
                    <div className="text-2xl font-semibold group-hover:transition-colors" style={{ color: '#20603A' }}>{value}</div>
                    {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
                </div>
            </Link>
        );
    }

    return (
        <div className="rounded-2xl p-4 shadow-sm bg-white hover:shadow-md transition">
            <div className="text-sm text-neutral-500">{title}</div>
            <div className="text-2xl font-semibold">{value}</div>
            {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
        </div>
    );
}

