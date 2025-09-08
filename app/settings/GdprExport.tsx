"use client";
import { useEffect, useState } from "react";

type Job = {
    id: number; status: "pending" | "running" | "done" | "error";
    created_at: number; started_at?: number; completed_at?: number;
    error?: string | null; size?: number | null; download?: string | null; expires_at?: number | null;
};

export default function GdprExport() {
    const [job, setJob] = useState<Job | null>(null);
    const [busy, setBusy] = useState(false);

    async function refresh() {
        const r = await fetch("/api/bff/profile/export/status", { credentials: "include" });
        const j = await r.json();
        setJob(j.job);
    }
    useEffect(() => { refresh(); }, []);

    async function requestExport() {
        setBusy(true);
        await fetch("/api/bff/profile/export/request", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include"
        });
        setBusy(false);
        refresh();
    }

    return (
        <div className="space-y-3">
            <button onClick={requestExport} disabled={busy} className="px-4 py-2 rounded bg-black text-white">
                {job?.status === "running" || job?.status === "pending" ? "Export in progress…" : "Request data export"}
            </button>

            {job && (
                <div className="text-sm">
                    <div>Status: <b>{job.status}</b></div>
                    {job.error && <div className="text-red-600">Error: {job.error}</div>}
                    {job.size ? <div>Size: {Math.round(job.size / 1024)} KB</div> : null}
                    {job.download && <a href={job.download} className="underline text-blue-600">Download ZIP</a>}
                    {job.expires_at && <div>Expires: {new Date(job.expires_at).toLocaleString()}</div>}
                </div>
            )}
        </div>
    );
}
