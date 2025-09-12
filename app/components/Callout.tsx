export default function Callout({
    tone = 'info',
    children,
    className = '',
}: { tone?: 'info' | 'success' | 'warning'; children: React.ReactNode; className?: string }) {
    const toneClasses =
        tone === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : tone === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border-blue-200 text-blue-800';
    return (
        <div className={`rounded-lg border p-3 text-sm ${toneClasses} ${className}`}>
            {children}
        </div>
    );
}
