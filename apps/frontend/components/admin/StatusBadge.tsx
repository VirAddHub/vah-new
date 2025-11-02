'use client';

export function StatusBadge({ severity }: { severity: 'ok' | 'degraded' | 'down' }) {
    const map = {
        ok: { label: 'Operational', cls: 'bg-green-100 text-green-800 border-green-300' },
        degraded: { label: 'Degraded', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
        down: { label: 'Down', cls: 'bg-red-100 text-red-800 border-red-300' },
    } as const;

    const s = map[severity] || map.down;

    return (
        <span className={`px-2 py-1 rounded text-sm border ${s.cls}`}>
            {s.label}
        </span>
    );
}

