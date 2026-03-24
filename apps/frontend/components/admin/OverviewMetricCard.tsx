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
            <div className="rounded-2xl p-4 shadow-sm bg-card animate-pulse h-24" />
        );
    }

    if (href) {
        return (
            <Link href={href} className="block group">
                <div className="rounded-2xl p-4 shadow-sm bg-card hover:shadow-md transition group-hover:border-2 group-hover:border-primary">
                    <div className="text-body-sm text-muted-foreground">{title}</div>
                    <div className="text-h3 font-semibold group-hover:transition-colors group-hover:text-primary">{value}</div>
                    {sub && <div className="text-caption text-muted-foreground mt-1">{sub}</div>}
                </div>
            </Link>
        );
    }

    return (
        <div className="rounded-2xl p-4 shadow-sm bg-card hover:shadow-md transition">
            <div className="text-body-sm text-muted-foreground">{title}</div>
            <div className="text-h3 font-semibold">{value}</div>
            {sub && <div className="text-caption text-muted-foreground mt-1">{sub}</div>}
        </div>
    );
}

