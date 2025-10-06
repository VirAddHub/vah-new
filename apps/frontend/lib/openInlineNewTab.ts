// Open a mail item's PDF inline in a new browser tab using the server route
// Assumes the user is authenticated; cookies are sent automatically for same-origin requests
export function openMailItemInlineNewTab(itemId: number) {
    const url = `/api/bff/mail/scan-url?mailItemId=${itemId}&disposition=inline`;
    // Must be triggered by a user gesture to avoid popup blockers
    window.open(url, "_blank", "noopener,noreferrer");
}


