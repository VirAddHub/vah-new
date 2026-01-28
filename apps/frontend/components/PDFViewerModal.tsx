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

                // Use BFF route (relative path - handled by Next.js) so the browser sends vah_session automatically
                const url = `/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=inline`;

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
    }, [isOpen, mailItemId, useBlobFallback]);


    return (
        <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden border-neutral-200 shadow-xl [&>button]:hidden transition-all duration-150">
                <div className="relative h-[90vh] bg-background">
                    {/* Custom Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-50 h-9 w-9 flex items-center justify-center bg-white hover:bg-neutral-50 shadow-md border border-neutral-200 hover:border-neutral-300 transition-all duration-150 rounded-lg"
                        aria-label="Close PDF viewer"
                    >
                        <X className="h-4 w-4 text-neutral-600" strokeWidth={2} />
                    </button>
                    {loading && (
                        <div className="absolute inset-0 grid place-items-center transition-opacity duration-150">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-primary"></div>
                                <span className="text-sm text-neutral-600 font-medium">Loading PDF…</span>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 grid place-items-center px-4 transition-opacity duration-150">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-600 font-medium">{String(error)}</p>
                            </div>
                        </div>
                    )}
                    {!loading && !error && viewerUrl && (
                        <div className="w-full h-full rounded-lg overflow-hidden shadow-inner border border-neutral-200 transition-opacity duration-150">
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
