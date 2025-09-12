'use client';

import { useState } from 'react';
import { useAddressFinder } from '@/app/hooks/useAddressFinder';
import type { Address } from '@/app/lib/address-finder';

type Props = {
  label?: string;
  onSelected: (a: Address) => void;
  defaultPostcode?: string;
};

export default function AddressFinder({ label = 'Business address', onSelected, defaultPostcode }: Props) {
  const [postcode, setPostcode] = useState(defaultPostcode ?? '');
  const [building, setBuilding] = useState('');
  const { loading, results, error, search } = useAddressFinder();

  return (
    <div className="space-y-2">
      <label className="block font-medium">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          placeholder="Postcode (e.g. SW1A 2AA)"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="border rounded px-3 py-2"
          inputMode="text"
          autoComplete="postal-code"
          aria-label="Postcode"
        />
        <input
          placeholder="Building no./name (optional)"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          className="border rounded px-3 py-2"
          aria-label="Building"
        />
        <button
          type="button"
          onClick={() => search(postcode, building)}
          className="border rounded px-3 py-2 hover:bg-gray-50"
          disabled={!postcode.trim() || loading}
        >
          {loading ? 'Searching…' : 'Find address'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="border rounded p-2 max-h-64 overflow-auto">
          <ul className="space-y-1">
            {results.map((a, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelected(a)}
                  className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded"
                >
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.postcode}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer select-none">Enter address manually</summary>
        <p className="text-gray-600 mt-1">If you can't find it, you can type it manually in the form fields.</p>
      </details>
    </div>
  );
}
