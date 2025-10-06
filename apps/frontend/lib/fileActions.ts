const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function openInline(url: string) {
    // Extract the mail item ID from the URL for the new tab approach
    const match = url.match(/\/api\/mail-items\/(\d+)\/download/);
    if (!match) throw new Error("Invalid mail item URL");
    const itemId = parseInt(match[1]);

    // Use the new tab approach without blobs
    const newTabUrl = `${API_BASE}/api/mail-items/${itemId}/download?disposition=inline`;
    const tab = window.open(newTabUrl, "_blank", "noopener,noreferrer");
    if (!tab) throw new Error("Popup blocked — allow popups for VirtualAddressHub.");
}

export async function downloadFile(url: string, fallback = "document.pdf") {
    // Extract the mail item ID from the URL for the new approach
    const match = url.match(/\/api\/mail-items\/(\d+)\/download/);
    if (!match) throw new Error("Invalid mail item URL");
    const itemId = parseInt(match[1]);

    // Use direct download without blob
    const downloadUrl = `${API_BASE}/api/mail-items/${itemId}/download?disposition=attachment`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
