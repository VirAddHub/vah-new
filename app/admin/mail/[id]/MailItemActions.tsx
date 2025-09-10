"use client";
import { useState } from "react";

export default function MailItemActions({ item }: {
    item: {
        id: string;
        status: string;
        file_id?: string | null;
        scan_file_url?: string | null;
    }
}) {
    const [busy, setBusy] = useState(false);
    const canMarkScanned = Boolean(item.file_id || item.scan_file_url);

    async function markScanned() {
        setBusy(true);
        try {
            const res = await fetch(`/api/admin/mail-items/${item.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('admin_token')}` // Adjust auth as needed
                },
                body: JSON.stringify({ status: "scanned" }),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                alert(j.error || "Unable to mark as scanned — attach scan first.");
                return;
            }

            // Refresh the page to show updated status
            location.reload();
        } catch (error) {
            alert("Network error - please try again");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex gap-2">
            <button
                className={`rounded border px-3 py-1 ${!canMarkScanned
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                onClick={markScanned}
                disabled={!canMarkScanned || busy}
                title={!canMarkScanned ? "Attach scan first" : undefined}
            >
                {busy ? "Marking…" : "Mark as Scanned"}
            </button>

            {!canMarkScanned && (
                <span className="text-sm text-gray-500">
                    ⚠️ Scan required
                </span>
            )}
        </div>
    );
}
