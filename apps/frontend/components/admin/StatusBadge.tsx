'use client';

export function StatusBadge({ severity }: { severity: 'ok' | 'degraded' | 'down' }) {
    const map = {
        ok: { label: 'Operational', cls: 'bg-primary/10 text-primary border-primary/30' },
        degraded: { label: 'Degraded', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
        down: { label: 'Down', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
    } as const;

    const s = map[severity] || map.down;

    return (
        <span className={`px-2 py-1 rounded text-body-sm border ${s.cls}`}>
            {s.label}
        </span>
    );
}

