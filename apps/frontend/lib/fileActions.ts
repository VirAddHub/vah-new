export async function openInline(url: string) {
    const resp = await fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/pdf" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const href = URL.createObjectURL(blob);
    const tab = window.open();
    if (!tab) throw new Error("Popup blocked — allow popups for VirtualAddressHub.");
    tab.location.href = href;
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export async function downloadFile(url: string, fallback = "document.pdf") {
    const resp = await fetch(`${url}?disposition=attachment`, { method: "GET", credentials: "include" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const cd = resp.headers.get("content-disposition") || "";
    const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
    const filename = decodeURIComponent(m?.[1] || m?.[2] || fallback);
    const blob = await resp.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30_000);
}
