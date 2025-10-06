"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    const [downloadName, setDownloadName] = React.useState<string>("document.pdf");

    const revokeUrl = React.useCallback(() => {
        if (viewerUrl && viewerUrl.startsWith("blob:")) {
            URL.revokeObjectURL(viewerUrl);
        }
    }, [viewerUrl]);

    React.useEffect(() => {
        setDownloadName(((mailItemSubject?.trim() ? safeName(mailItemSubject) : "document") + ".pdf"));
    }, [mailItemSubject]);

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

                const blob = await res.blob();
                const bUrl = URL.createObjectURL(blob);
                if (!cancelled) {
                    if (process.env.NODE_ENV !== 'production') console.debug('[PDFViewerModal] viewerUrl', bUrl.slice(0, 10));
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

    const handleDownload = async () => {
        try {
            if (!mailItemId) return;
            const token = (typeof window !== 'undefined') ? localStorage.getItem('vah_jwt') : null;
            const res = await fetch(`/api/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=attachment`, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setError(e?.message || 'Download failed');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle className="truncate">{mailItemSubject || 'Document'}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownload}>Download PDF</Button>
                            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="relative h-[calc(90vh-56px)] bg-muted">
                    {loading && (
                        <div className="absolute inset-0 grid place-items-center text-sm">Loading PDF…</div>
                    )}
                    {error && (
                        <div className="absolute inset-0 grid place-items-center px-4 text-sm text-red-600">
                            {String(error)}
                        </div>
                    )}
                    {!loading && !error && viewerUrl && (
                        <iframe
                            title="PDF preview"
                            src={viewerUrl}
                            className="w-full h-full"
                            sandbox="allow-scripts allow-same-origin allow-downloads"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function safeName(s: string) {
    return s.replace(/[^\p{L}\p{N}\-_., ]+/gu, '').slice(0, 120) || 'document';
}

async function safeText(res: Response) {
    try {
        return await res.text();
    } catch {
        return '';
    }
}
