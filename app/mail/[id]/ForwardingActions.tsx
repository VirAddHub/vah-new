'use client';

import { useState } from 'react';

const FREE_TAGS = ['HMRC', 'Companies House'] as const;

export default function ForwardingActions({
  mailId,
  tag,
  kycApproved,
  eligibleByAge,
}: {
  mailId: string;
  tag?: string | null;
  kycApproved: boolean;
  eligibleByAge: boolean; // ≤ 14 days
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qualifiesFree = !!tag && FREE_TAGS.includes(tag as any);
  const canForward = kycApproved && eligibleByAge;

  async function submitForward() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/forwarding-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // cheap idempotency: same key prevents double-clicks
          'X-Idempotency-Key': `mail-${mailId}`,
        },
        body: JSON.stringify({ mail_item_id: mailId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `Request failed (${res.status})`);
      } else {
        // success — close and rely on page revalidation / toast
        setConfirmOpen(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        More actions ▾
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute z-10 mt-2 w-52 rounded-md border bg-white shadow"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setMenuOpen(false);
              // do your scan open here; this keeps UX consistent
              const url = document.getElementById('open-scan-url')?.getAttribute('data-url');
              if (url) window.open(url, '_blank');
            }}
          >
            Open scan
          </button>

          {canForward && (
            <button
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              Request forwarding
            </button>
          )}

          {!canForward && (
            <div className="px-3 py-2 text-xs text-gray-500">
              Forwarding unavailable (KYC & ≤14 days required)
            </div>
          )}
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-semibold">Request forwarding?</h3>
            <p className="mb-3 text-sm text-gray-700">
              We'll forward this letter to your saved address.
              {qualifiesFree ? (
                <>
                  {' '}
                  <strong>Cost: £0.00 (HMRC/Companies House)</strong>.
                </>
              ) : (
                <>
                  {' '}
                  <strong>Cost:</strong> Royal Mail postage <strong>+ £1.50 handling</strong>.
                </>
              )}
              {' '}You'll receive a confirmation once dispatched.
            </p>

            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
                onClick={submitForward}
                disabled={submitting}
              >
                {submitting ? 'Requesting…' : 'Confirm & request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
