'use client';
import { useAddressAutocomplete } from '@/app/hooks/useAddressAutocomplete';
import { useEffect, useRef, useState } from 'react';

type Props = {
    onSelected: (address: {
        line1: string; line2?: string; line3?: string;
        city: string; county?: string; postcode: string; country?: string; formatted?: string;
    }) => void;
    placeholder?: string;
    label?: string;
};

export default function AddressAutocomplete({ onSelected, placeholder = 'Start typing your address…', label = 'Business address' }: Props) {
    const { query, loading, suggestions, error, search, selectById, selected } = useAddressAutocomplete();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    useEffect(() => {
        if (selected) onSelected(selected);
    }, [selected, onSelected]);

    return (
        <div className="w-full" ref={wrapRef}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
                value={query}
                onChange={(e) => { search(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className="w-full border rounded-lg px-3 py-2"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="addr-listbox"
            />
            {open && (suggestions.length > 0 || loading || error) && (
                <div className="mt-1 border rounded-lg bg-white shadow-md max-h-60 overflow-auto" role="listbox" id="addr-listbox">
                    {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}
                    {error && <div className="px-3 py-2 text-sm text-red-600">{error}</div>}
                    {suggestions.map((s) => (
                        <button
                            key={s.id}
                            role="option"
                            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                            onClick={async () => {
                                setOpen(false);
                                await selectById(s.id);
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                    {!loading && !error && suggestions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                    )}
                </div>
            )}
        </div>
    );
}
