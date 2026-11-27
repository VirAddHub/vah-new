"use client";

import { useAuthedSWR } from "../../lib/useAuthedSWR";
import { CheckCircle, AlertTriangle, Clock, FileWarning } from "lucide-react";

type IssueReason = "bad_filename" | "customer_not_found" | "no_business" | "conflict" | "move_pending" | "import_failed";

interface ImporterStatus {
    health: "ok" | "problem" | "no_report";
    workerSilent: boolean;
    lastReportAt: string | null;
    lastSuccessAt: string | null;
    problem: string | null;
    problemDetail: string | null;
    problemSince: string | null;
    filesInInbox: number | null;
    importedLastRun: number | null;
    intervalMinutes: number;
    issues: Array<{ fileName: string; reason: IssueReason; detail?: string | null; firstSeenAt: string }>;
}

const REASON_LABEL: Record<IssueReason, string> = {
    bad_filename: "Name not recognised",
    customer_not_found: "No customer with that number",
    no_business: "Customer has no business set up",
    conflict: "Clashes with a letter already filed",
    move_pending: "Filed, not yet moved to Processed_Mail",
    import_failed: "Couldn't be added yet (retrying)",
};

const REASON_FIX: Record<IssueReason, string> = {
    bad_filename: "Rename it in OneDrive using a name from the Filenames tool.",
    customer_not_found: "Check the customer number, then rename the file in OneDrive.",
    no_business: "Open the customer and check their account is set up, then leave the file in place.",
    conflict: "Check it is a different letter and the right customer, then rename it in OneDrive (use the next letter number).",
    move_pending: "No action needed; it is retried every run. Tell the owner if it stays for more than an hour.",
    import_failed: "No action needed unless this stays for more than an hour.",
};

const PROBLEM_FIX: Record<string, string> = {
    onedrive_access_denied:
        "New scans won't reach customers until this is fixed. Microsoft signed the importer in but refused the folder: check the app the worker uses (GRAPH_CLIENT_ID) has Files.ReadWrite.All granted in Enterprise applications, and that the OneDrive account still exists.",
    onedrive_folder_not_found:
        "New scans won't reach customers until this is fixed. The inbox folder may have been moved, renamed or deleted.",
    microsoft_sign_in_failed:
        "New scans won't reach customers until this is fixed. The importer's Microsoft app sign-in was refused; the client secret may have expired.",
    not_configured: "New scans won't reach customers until the importer's OneDrive settings are completed.",
    onedrive_error: "New scans won't reach customers while this continues.",
};

const ago = (iso: string | null): string => {
    if (!iso) return "never";
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours} h ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const when = (iso: string | null): string =>
    iso
        ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";

/**
 * Shows whether scans saved to OneDrive are reaching customers, and lists files the importer
 * couldn't file. Used on the Mail section and the Filenames tool.
 */
export function MailImporterStatus({ compact = false }: { compact?: boolean }) {
    // The shared fetcher unwraps { ok, data } to the data itself
    const { data: status, error } = useAuthedSWR<ImporterStatus>("/api/admin/mail-import/status", {
        refreshInterval: 60000,
        revalidateOnFocus: true,
    });

    if (error || !status || !status.health) {
        return null;
    }

    const issues = status.issues || [];

    let tone: "ok" | "warn" | "bad";
    let headline: string;
    let detail: string;

    if (status.health === "no_report") {
        tone = "warn";
        headline = "Waiting for the mail importer";
        detail = `It checks the OneDrive inbox every ${status.intervalMinutes} minutes. If this doesn't change within ${status.intervalMinutes * 2} minutes, the importer isn't running.`;
    } else if (status.workerSilent) {
        tone = "bad";
        headline = "The mail importer has stopped checking OneDrive";
        detail = `Last check ${ago(status.lastReportAt)}. New scans won't reach customers until it is running again.`;
    } else if (status.problem) {
        tone = "bad";
        headline = status.problemDetail || "The mail importer can't read the OneDrive inbox";
        detail = `${PROBLEM_FIX[status.problem] || PROBLEM_FIX.onedrive_error} Failing since ${when(status.problemSince)}; last good check ${ago(status.lastSuccessAt)}.`;
    } else {
        tone = issues.length ? "warn" : "ok";
        headline = issues.length
            ? `Mail importer is working: ${issues.length} file${issues.length === 1 ? "" : "s"} need${issues.length === 1 ? "s" : ""} attention`
            : "Mail importer is working";
        detail = `Last checked ${ago(status.lastReportAt)} (every ${status.intervalMinutes} min).${
            typeof status.importedLastRun === "number" && status.importedLastRun > 0
                ? ` Added ${status.importedLastRun} letter${status.importedLastRun === 1 ? "" : "s"} on the last check.`
                : ""
        }`;
    }

    const toneClass =
        tone === "ok"
            ? "border-success/25 bg-success/[0.06]"
            : tone === "warn"
              ? "border-line bg-mist"
              : "border-destructive/25 bg-destructive/[0.06]";
    const Icon = tone === "ok" ? CheckCircle : tone === "warn" ? Clock : AlertTriangle;
    const iconClass = tone === "ok" ? "text-success" : tone === "warn" ? "text-ink" : "text-destructive";

    return (
        <div className={`rounded-lg border p-4 ${toneClass}`} role="status" aria-live="polite">
            <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconClass}`} aria-hidden />
                <div className="min-w-0">
                    <p className="font-medium text-ink">{headline}</p>
                    <p className="text-body-sm text-muted-foreground mt-0.5">{detail}</p>
                </div>
            </div>

            {issues.length > 0 && !compact && (
                <div className="mt-3 ml-8">
                    <p className="text-body-sm font-medium text-ink mb-1.5 flex items-center gap-1.5">
                        <FileWarning className="h-4 w-4" aria-hidden />
                        Files in the OneDrive inbox that couldn&apos;t be added to a customer
                    </p>
                    <ul className="space-y-2">
                        {issues.map((issue) => (
                            <li key={`${issue.fileName}|${issue.reason}`} className="text-body-sm">
                                <span className="font-mono break-all text-ink">{issue.fileName}</span>
                                <span className="text-muted-foreground">
                                    {" "}· {REASON_LABEL[issue.reason]} (since {when(issue.firstSeenAt)}).{" "}
                                    {REASON_FIX[issue.reason]}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {issues.length > 0 && compact && (
                <p className="mt-2 ml-8 text-body-sm text-muted-foreground">
                    See Mail for the list of files that need attention.
                </p>
            )}
        </div>
    );
}
