"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Search, Eye, Download, Scissors } from "lucide-react";
import { apiClient, safe } from "../../lib/apiClient";
import { useSimpleDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { useAuthedSWR } from "../../lib/useAuthedSWR";
import { useToast } from "@/components/ui/use-toast";
import { MailImporterStatus } from "./MailImporterStatus";

type DestructionState = "destroyed" | "forwarded" | "forwarding_open" | "due" | "not_yet";

interface MailItem {
    id: number;
    user_id: number;
    user_email: string;
    first_name: string | null;
    last_name: string | null;
    subject: string | null;
    sender_name: string | null;
    tag: string | null;
    received_date: string | null;
    received_at_ms: number | string | null;
    created_at: number | string | null;
    physical_destruction_date: string | null;
    destroy_from: string | null;
    destruction_state: DestructionState;
}

interface MailListResponse {
    items: MailItem[];
    total: number;
    counts?: { all: number; needsDestruction: number; destroyed: number };
}

type View = "needs_destruction" | "all";

const PAGE_SIZE = 200;

const toDate = (value: number | string | null | undefined): Date | null => {
    if (value === null || value === undefined || value === "") return null;
    const asNumber = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    const d = new Date(asNumber as any);
    return Number.isNaN(d.getTime()) ? null : d;
};

const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const receivedOf = (item: MailItem) =>
    toDate(item.received_at_ms) || toDate(item.received_date) || toDate(item.created_at);

function ShredStatus({ item }: { item: MailItem }) {
    switch (item.destruction_state) {
        case "destroyed":
            return <Badge variant="secondary">Shredded {fmt(toDate(item.physical_destruction_date))}</Badge>;
        case "forwarded":
            return <Badge variant="secondary">Forwarded, nothing to shred</Badge>;
        case "forwarding_open":
            return <Badge variant="outline">Forwarding requested: keep it</Badge>;
        case "due":
            return <Badge variant="destructive">Due since {fmt(toDate(item.destroy_from))}</Badge>;
        default:
            return <Badge variant="outline">Keep until {fmt(toDate(item.destroy_from))}</Badge>;
    }
}

export function MailSection() {
    const { toast } = useToast();
    const [view, setView] = useState<View>("needs_destruction");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
    const [working, setWorking] = useState(false);
    const { query: searchTerm, setQuery: setSearchTerm, debouncedQuery } = useSimpleDebouncedSearch(300, 0);

    const params = useMemo(
        () => ({ view, q: debouncedQuery || "", limit: String(PAGE_SIZE), offset: "0" }),
        [view, debouncedQuery]
    );

    const { data, isLoading, mutate, error: loadError } = useAuthedSWR<MailListResponse>(["/api/admin/mail-items", params], {
        dedupingInterval: 5000,
        revalidateOnFocus: true,
        refreshInterval: 60000,
        refreshWhenHidden: false,
    });

    const items: MailItem[] = safe(data?.items, []);
    const counts = data?.counts;
    const total = data?.total ?? items.length;
    const dueIds = items.filter((i) => i.destruction_state === "due").map((i) => i.id);
    const allDueSelected = dueIds.length > 0 && dueIds.every((id) => selected.has(id));

    const changeView = (next: View) => {
        setView(next);
        setSelected(new Set());
    };

    const toggle = (id: number, on: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggleAll = (on: boolean) => setSelected(on ? new Set(dueIds) : new Set());

    const errorText = (response: any): string => {
        const body = response?.data as { message?: string; error?: string } | undefined;
        if (response?.status === 403) return "Your admin session has expired. Sign in again.";
        return body?.message || response?.message || body?.error || "Something went wrong";
    };

    /** Record each letter as shredded, one at a time, so every one is checked and logged by the server. */
    const markShredded = async (ids: number[]) => {
        setWorking(true);
        const failures: string[] = [];
        let done = 0;
        for (const id of ids) {
            try {
                const response = await apiClient.post(`/api/bff/admin/mail-items/${id}/mark-destroyed`, undefined, {
                    credentials: "include",
                });
                if (response.ok && ((response as any).data?.ok !== false)) {
                    done++;
                } else {
                    failures.push(`#${id}: ${errorText(response)}`);
                }
            } catch (err: any) {
                failures.push(`#${id}: ${err?.message || "Something went wrong"}`);
            }
        }
        setWorking(false);
        setConfirmIds(null);
        setSelected(new Set());
        await mutate();

        if (done > 0) {
            toast({
                title: `${done} letter${done === 1 ? "" : "s"} recorded as shredded`,
                description: "Each one is in the shredding log with your name and today's date.",
            });
        }
        if (failures.length > 0) {
            toast({
                title: `${failures.length} couldn't be recorded`,
                description: failures.slice(0, 3).join(" · ") + (failures.length > 3 ? " …" : ""),
                variant: "destructive",
            });
        }
    };

    const downloadLog = () => {
        window.location.href = "/api/bff/admin/exports/destruction-log";
    };

    const customerName = (item: MailItem) =>
        `${item.first_name || ""} ${item.last_name || ""}`.trim() || item.user_email || `Customer #${item.user_id}`;

    const showCheckboxes = view === "needs_destruction";
    const columnCount = showCheckboxes ? 6 : 5;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-bold">Mail</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Paper letters are kept for 30 days after they arrive, then shredded. Letters that were forwarded,
                        or that a customer has asked to be forwarded, are never listed for shredding.
                    </p>
                </div>
                <Button onClick={downloadLog} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" aria-hidden />
                    Download shredding log
                </Button>
            </div>

            <MailImporterStatus />

            {loadError && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-destructive">
                    Could not load mail.
                    <Button variant="outline" size="sm" onClick={() => mutate()}>Retry</Button>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-line p-1" role="tablist" aria-label="Which mail to show">
                    {(
                        [
                            ["needs_destruction", `To shred (${counts?.needsDestruction ?? "…"})`],
                            ["all", `All mail (${counts?.all ?? "…"})`],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={view === key}
                            onClick={() => changeView(key)}
                            className={`px-3 py-1.5 rounded-md text-body-sm font-medium ${
                                view === key ? "bg-ink text-paper" : "text-ink hover:bg-mist"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                    <Input
                        placeholder="Search by letter number, customer number, name, email, sender or subject"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        aria-label="Search mail"
                    />
                </div>
            </div>

            {showCheckboxes && selected.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-mist px-4 py-3">
                    <span className="text-body-sm font-medium">
                        {selected.size} letter{selected.size === 1 ? "" : "s"} selected
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                            Clear
                        </Button>
                        <Button size="sm" onClick={() => setConfirmIds(Array.from(selected))} disabled={working}>
                            <Scissors className="h-4 w-4 mr-1.5" aria-hidden />
                            Mark as shredded
                        </Button>
                    </div>
                </div>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {showCheckboxes && (
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={allDueSelected}
                                        onCheckedChange={(v) => toggleAll(v === true)}
                                        disabled={dueIds.length === 0}
                                        aria-label="Select every letter on this page"
                                    />
                                </TableHead>
                            )}
                            <TableHead>Letter</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>Shredding</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnCount} className="text-center py-8 text-muted-foreground">
                                    Loading…
                                </TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnCount} className="text-center py-8 text-muted-foreground">
                                    {debouncedQuery
                                        ? "No mail matches that search."
                                        : view === "needs_destruction"
                                          ? "Nothing to shred today."
                                          : "No mail yet."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const isDue = item.destruction_state === "due";
                                return (
                                    <TableRow key={item.id}>
                                        {showCheckboxes && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.has(item.id)}
                                                    onCheckedChange={(v) => toggle(item.id, v === true)}
                                                    disabled={!isDue}
                                                    aria-label={`Select letter #${item.id}`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="font-medium">
                                                #{item.id} · {item.subject || "Untitled letter"}
                                            </div>
                                            <div className="text-caption text-muted-foreground">
                                                {[item.sender_name, item.tag].filter(Boolean).join(" · ") || "Sender not recorded"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{customerName(item)}</div>
                                            <div className="text-caption text-muted-foreground">
                                                #{item.user_id} · {item.user_email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{fmt(receivedOf(item))}</TableCell>
                                        <TableCell>
                                            <ShredStatus item={item} />
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`/admin/mail/${item.id}`, "_blank")}
                                                aria-label={`Open letter #${item.id}`}
                                            >
                                                <Eye className="h-4 w-4" aria-hidden />
                                            </Button>
                                            {isDue && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="ml-2"
                                                    onClick={() => setConfirmIds([item.id])}
                                                    disabled={working}
                                                >
                                                    Shredded
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {total > items.length && (
                <p className="text-body-sm text-muted-foreground">
                    Showing the first {items.length} of {total}. Search to narrow the list.
                </p>
            )}

            <Dialog open={confirmIds !== null} onOpenChange={(open) => !open && !working && setConfirmIds(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Record {confirmIds?.length === 1 ? "this letter" : `${confirmIds?.length ?? 0} letters`} as shredded?
                        </DialogTitle>
                        <DialogDescription>
                            Only do this once the paper is in the shredder. Each letter is added to the shredding log with
                            your name and today&apos;s date, and the customer can no longer ask for it to be forwarded. This
                            can&apos;t be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmIds(null)} disabled={working}>
                            Cancel
                        </Button>
                        <Button onClick={() => confirmIds && markShredded(confirmIds)} disabled={working}>
                            {working ? "Recording…" : "Yes, they're shredded"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
