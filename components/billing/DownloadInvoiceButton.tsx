'use client';
import { useState } from 'react';

export default function DownloadInvoiceButton({ invoiceId }: { invoiceId: number }) {
    const [loading, setLoading] = useState(false);

    const mint = async () => {
        const r = await fetch(`/api/bff/billing/invoices/${invoiceId}/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!r.ok) throw new Error(`link:${r.status}`);
        const { token } = await r.json();
        return token as string;
    };

    const redirectDownload = (token: string) => {
        window.location.href = `/api/invoices/${token}`;
    };

    const onClick = async () => {
        setLoading(true);
        try {
            const token1 = await mint();
            redirectDownload(token1);
        } catch (e: any) {
            if (e.message === 'expired') {
                try {
                    const token2 = await mint();
                    redirectDownload(token2);
                } catch {
                    alert('Download link expired. Please try again.');
                }
            } else {
                alert('Could not prepare the download. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return <button onClick={onClick} disabled={loading}>{loading ? 'Preparing…' : 'Download'}</button>;
}
