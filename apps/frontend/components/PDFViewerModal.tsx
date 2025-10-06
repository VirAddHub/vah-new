"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PDFViewerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    mailItemId: number | null;
    mailItemSubject?: string;
    useBlobFallback?: boolean;
};

export default function PDFViewerModal({
    isOpen,
    onClose,
    mailItemId,
    mailItemSubject,
    useBlobFallback = true,
}: PDFViewerModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);

    const revokeUrl = React.useCallback(() => {
        try {
            if (viewerUrl && viewerUrl.startsWith("blob:")) {
                URL.revokeObjectURL(viewerUrl);
            }
        } catch { }
    }, [viewerUrl]);


    React.useEffect(() => {
        let cancelled = false;

        async function load() {
            setError(null);
            setLoading(true);
            revokeUrl();
            setViewerUrl(null);

            try {
                if (!isOpen || !mailItemId) return;

                // Build absolute backend URL so the browser sends vah_session automatically
                const apiBaseRaw =
                    process.env.NEXT_PUBLIC_API_BASE ||
                    process.env.BACKEND_API_ORIGIN ||
                    '';
                const apiBase = apiBaseRaw.replace(/\/+$/, '');
                const baseWithApi = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
                const url = `${baseWithApi}/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=inline`;

                if (!useBlobFallback) {
                    if (!cancelled) setViewerUrl(url);
                    return;
                }

                // Forward JWT via header so BFF can auth to backend and force no-store
                const token = (typeof window !== 'undefined') ? localStorage.getItem('vah_jwt') : null;
                const res = await fetch(url, {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!res.ok) {
                    const txt = await safeText(res);
                    throw new Error(txt || `Failed to load PDF (${res.status})`);
                }

                const ab = await res.arrayBuffer();
                const blob = new Blob([ab], { type: 'application/pdf' }); // ✅ force proper MIME
                const bUrl = URL.createObjectURL(blob);
                if (!cancelled) {
                    console.debug('[PDFViewerModal] blob url:', bUrl.slice(0, 20), 'ct=application/pdf');
                    setViewerUrl(bUrl);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Failed to load document');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
            revokeUrl();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mailItemId, useBlobFallback]);


    return (
        <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden">
                <div className="relative h-[90vh] bg-muted">
                    {loading && (
                        <div className="absolute inset-0 grid place-items-center text-sm">Loading PDF…</div>
                    )}
                    {error && (
                        <div className="absolute inset-0 grid place-items-center px-4 text-sm text-red-600">
                            {String(error)}
                        </div>
                    )}
                    {!loading && !error && viewerUrl && (
                        <object
                            data={viewerUrl}
                            type="application/pdf"
                            className="w-full h-full"
                        >
                            <iframe
                                title="PDF preview"
                                src={viewerUrl}
                                className="w-full h-full border-0"
                            />
                        </object>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


async function safeText(res: Response) {
    try {
        return await res.text();
    } catch {
        return '';
    }
}
