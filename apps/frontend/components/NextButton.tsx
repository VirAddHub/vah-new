'use client';
import { useRouter } from 'next/navigation';

export function NextButton({ href, children }: { href: string; children: React.ReactNode }) {
    const router = useRouter();
    return (
        <button
            type="button"
            onClick={() => {
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                router.push(href, { scroll: true });
            }}
        >
            {children}
        </button>
    );
}
