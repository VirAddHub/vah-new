const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function openInline(url: string) {
    // Extract the mail item ID from the URL for the new tab approach
    const match = url.match(/\/api\/mail-items\/(\d+)\/download/);
    if (!match) throw new Error("Invalid mail item URL");
    const itemId = parseInt(match[1]);

    // Use the BFF route for safe headers
    const newTabUrl = `${API_BASE}/api/bff/mail/scan-url?mailItemId=${itemId}&disposition=inline`;
    const tab = window.open(newTabUrl, "_blank", "noopener,noreferrer");
    if (!tab) throw new Error("Popup blocked — allow popups for VirtualAddressHub.");
}

export async function downloadFile(url: string, fallback = "document.pdf") {
    // Extract the mail item ID from the URL for the new approach
    const match = url.match(/\/api\/mail-items\/(\d+)\/download/);
    if (!match) throw new Error("Invalid mail item URL");
    const itemId = parseInt(match[1]);

    // Use BFF route for safe headers - construct absolute backend URL
    const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_API_ORIGIN || '';
    const apiBase = apiBaseRaw.replace(/\/+$/, '');
    const baseWithApi = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
    const downloadUrl = `${baseWithApi}/bff/mail/scan-url?mailItemId=${itemId}&disposition=attachment`;
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
