"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePDFPreloader } from "@/hooks/usePDFPreloader";

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
    const { getPreloadedURL } = usePDFPreloader({ useBlobFallback });

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

                // Check if PDF is already preloaded
                const preloadedUrl = getPreloadedURL(mailItemId);
                if (preloadedUrl) {
                    if (!cancelled) {
                        console.debug('[PDFViewerModal] Using preloaded URL');
                        setViewerUrl(preloadedUrl);
                        setLoading(false);
                    }
                    return;
                }

                // Build absolute backend URL so the browser sends vah_session automatically
                const apiBaseRaw =
                    process.env.NEXT_PUBLIC_API_BASE ||
                    process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN ||
                    '';
                const apiBase = apiBaseRaw.replace(/\/+$/, '');
                const baseWithApi = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
                const url = `${baseWithApi}/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=inline`;

                if (!useBlobFallback) {
                    if (!cancelled) setViewerUrl(url);
                    return;
                }

                // Forward JWT via header so BFF can auth to backend
                const token = (typeof window !== 'undefined') ? localStorage.getItem('vah_jwt') : null;
                const res = await fetch(url, {
                    credentials: 'include',
                    cache: 'default',
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
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden border-primary/20 shadow-lg [&>button]:hidden">
                <div className="relative h-[90vh] bg-gradient-to-br from-background to-muted/30">
                    {/* Custom Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-50 h-8 w-8 flex items-center justify-center bg-white/90 hover:bg-white shadow-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 rounded-md hover:shadow-xl"
                        aria-label="Close PDF viewer"
                    >
                        <X className="h-4 w-4 text-gray-600 hover:text-gray-800" />
                    </button>
                    {loading && (
                        <div className="absolute inset-0 grid place-items-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="text-sm text-primary font-medium">Loading PDF…</span>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 grid place-items-center px-4">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-600 font-medium">{String(error)}</p>
                            </div>
                        </div>
                    )}
                    {!loading && !error && viewerUrl && (
                        <div className="w-full h-full rounded-lg overflow-hidden shadow-inner border border-primary/10">
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
                        </div>
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
