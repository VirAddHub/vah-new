import { X, Download } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface PDFViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    mailItemId: number | null;
    mailItemSubject?: string;
    useBlobFallback?: boolean; // Option B: use blob if iframe fails
}

export function PDFViewerModal({
    isOpen,
    onClose,
    mailItemId,
    mailItemSubject = "Mail Scan Preview",
    useBlobFallback = false
}: PDFViewerModalProps) {
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [iframeError, setIframeError] = useState(false);

    // Option B: Load blob when using fallback
    useEffect(() => {
        let revoked = false;
        let toRevoke: string | null = null;

    async function loadBlob(id: string) {
            setIsLoading(true);
            setViewerUrl(null);
            setIframeError(false);

            try {
        const resp = await fetch(`${API_BASE}/api/mail-items/${id}/download?disposition=inline`, {
                    credentials: "include"
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                toRevoke = url;
                if (!revoked) setViewerUrl(url);
            } catch (error) {
                console.error('Failed to load PDF blob:', error);
                setIframeError(true);
            } finally {
                setIsLoading(false);
            }
        }

        if (useBlobFallback && mailItemId) {
            void loadBlob(mailItemId.toString());
        } else {
            setViewerUrl(null);
            setIframeError(false);
        }

        return () => {
            revoked = true;
            if (toRevoke) URL.revokeObjectURL(toRevoke);
        };
    }, [mailItemId, useBlobFallback]);

  const handleDownload = () => {
        if (!mailItemId) return;
    const downloadUrl = `${API_BASE}/api/mail-items/${mailItemId}/download?disposition=attachment`;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `mail-${mailItemId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleIframeError = () => {
        console.log('Iframe failed to load, switching to blob fallback');
        setIframeError(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-[95vw] h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold truncate">
                            {mailItemSubject}
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* PDF Viewer - Option A (iframe) or Option B (blob) */}
                <div className="flex-1 bg-muted/20 p-4 overflow-hidden">
                    {useBlobFallback || iframeError ? (
                        // Option B: Blob viewer
                        viewerUrl ? (
                            <iframe
                                src={viewerUrl}
                                className="w-full h-full border-0 rounded bg-white"
                                title="Mail Scan Preview"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                {isLoading ? 'Loading preview...' : 'Failed to load preview'}
                            </div>
                        )
                    ) : (
                        // Option A: Direct iframe to API
            <iframe
                            key={mailItemId || 'none'} // forces reload on mail change
                            src={
                                mailItemId
                  ? `${API_BASE}/api/mail-items/${mailItemId}/download?disposition=inline#toolbar=1`
                                    : 'about:blank'
                            }
                            className="w-full h-full border-0 rounded bg-white"
                            title="Mail Scan Preview"
                            onError={handleIframeError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
